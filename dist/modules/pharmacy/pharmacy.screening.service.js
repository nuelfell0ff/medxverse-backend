import { Types } from 'mongoose';
import { PatientModel } from '../patient/patient.model.js';
import { PrescriptionModel, FormularyEntryModel } from './pharmacy.model.js';
import { ScreeningStatus, PrescriptionStatus, } from './pharmacy.types.js';
export class PharmacyScreeningService {
    static async screenPrescription(hospitalId, prescriptionId) {
        const prescription = await PrescriptionModel.findOne({
            _id: prescriptionId,
            hospitalId,
        });
        if (!prescription) {
            throw Object.assign(new Error('Prescription not found.'), {
                statusCode: 404,
            });
        }
        const issues = [];
        const patient = await PatientModel.findById(prescription.patientId).lean();
        const patientAny = patient;
        const allergies = Array.isArray(patientAny?.allergies)
            ? patientAny.allergies
            : [];
        const allergyText = allergies
            .map((a) => typeof a === 'string'
            ? a
            : `${a?.name || ''} ${a?.substance || ''}`)
            .join(' ')
            .toLowerCase();
        for (let i = 0; i < prescription.medications.length; i += 1) {
            const medication = prescription.medications[i];
            const name = `${medication.medicationName} ${medication.genericName || ''}`.toLowerCase();
            if (allergyText &&
                name &&
                allergyText
                    .split(/\s+/)
                    .some((token) => token.length >= 4 && name.includes(token))) {
                issues.push({
                    code: 'ALLERGY_POSSIBLE_MATCH',
                    severity: 'BLOCK',
                    message: `Possible patient allergy match for ${medication.medicationName}.`,
                    medicationIndex: i,
                });
            }
            const formulary = (await FormularyEntryModel.findOne({
                hospitalId: new Types.ObjectId(hospitalId),
                $and: [
                    {
                        $or: [
                            { medicationName: medication.medicationName },
                            ...(medication.genericName
                                ? [{ genericName: medication.genericName }]
                                : []),
                        ],
                    },
                    {
                        $or: [
                            { department: prescription.department },
                            { department: { $exists: false } },
                            { department: null },
                        ],
                    },
                    {
                        $or: [
                            { effectiveTo: { $exists: false } },
                            { effectiveTo: null },
                            { effectiveTo: { $gte: new Date() } },
                        ],
                    },
                ],
                status: { $in: ['APPROVED', 'RESTRICTED'] },
                effectiveFrom: { $lte: new Date() },
            })
                .lean()
                .catch(() => null));
            if (!formulary) {
                issues.push({
                    code: 'FORMULARY_REVIEW',
                    severity: 'WARNING',
                    message: `${medication.medicationName} is not confirmed on the active formulary for this department.`,
                    medicationIndex: i,
                });
            }
            else if (formulary.status === 'RESTRICTED') {
                issues.push({
                    code: 'FORMULARY_RESTRICTED',
                    severity: 'WARNING',
                    message: `${medication.medicationName} is restricted by formulary policy.`,
                    medicationIndex: i,
                });
            }
        }
        // Lightweight interaction screening. The architecture records the result and
        // provides a safe integration seam for Lexi/AI CDS; it does not claim to replace
        // a licensed drug-interaction database.
        for (let i = 0; i < prescription.medications.length; i += 1) {
            for (let j = i + 1; j < prescription.medications.length; j += 1) {
                const a = prescription.medications[i];
                const b = prescription.medications[j];
                if (a.genericName &&
                    b.genericName &&
                    a.genericName.toLowerCase() === b.genericName.toLowerCase()) {
                    issues.push({
                        code: 'DUPLICATE_THERAPY',
                        severity: 'WARNING',
                        message: `Duplicate therapy detected: ${a.genericName}.`,
                        medicationIndex: j,
                    });
                }
            }
        }
        const status = issues.some((i) => i.severity === 'BLOCK')
            ? ScreeningStatus.BLOCKED
            : issues.some((i) => i.severity === 'WARNING')
                ? ScreeningStatus.WARNING
                : ScreeningStatus.PASSED;
        prescription.screeningStatus = status;
        prescription.screeningSummary = issues.length
            ? issues.map((i) => i.message).join(' | ')
            : 'No pharmacy screening issues detected.';
        prescription.status =
            status === ScreeningStatus.BLOCKED
                ? PrescriptionStatus.REJECTED
                : PrescriptionStatus.UNDER_REVIEW;
        prescription.reviewedAt = new Date();
        await prescription.save();
        return {
            status,
            issues,
            checkedAt: new Date(),
        };
    }
}
