import { OutpatientModel } from './outpatient.model.js';
import { BillingCaptureStatus, ConsultationStatus, OUTPATIENT_CONSULTATION_SERVICE_CODE, } from './outpatient.types.js';
import { createCharge, resolvePrice, } from '../billing/billing.service.js';
import { BillingSourceModule, ChargeCategory, } from '../billing/billing.types.js';
export class OutpatientService {
    async createEncounter(input) {
        let catalogue = undefined;
        if (input.pricingCatalogueItemId || input.departmentId) {
            catalogue = await resolvePrice({
                hospitalId: input.hospitalId,
                code: OUTPATIENT_CONSULTATION_SERVICE_CODE,
                catalogueItemId: input.pricingCatalogueItemId,
                departmentId: input.departmentId,
                departmentName: 'Outpatient',
                category: ChargeCategory.CONSULTATION,
                serviceDate: new Date(),
            });
        }
        return OutpatientModel.create({
            ...input,
            status: ConsultationStatus.IN_QUEUE,
            queuedAt: new Date(),
            pricingCatalogueItemId: catalogue?.catalogueItemId,
            pricingCataloguePlanName: catalogue?.planName || catalogue?.name,
            pricingCataloguePrice: catalogue?.price,
            pricingCatalogueVersion: catalogue?.version,
            pricingCatalogueCurrency: catalogue?.currency,
            billing: {
                status: BillingCaptureStatus.NOT_ATTEMPTED,
                serviceCode: OUTPATIENT_CONSULTATION_SERVICE_CODE,
                catalogueItemId: catalogue?.catalogueItemId,
                cataloguePlanName: catalogue?.planName || catalogue?.name,
                cataloguePrice: catalogue?.price,
                catalogueVersion: catalogue?.version,
                catalogueCurrency: catalogue?.currency,
            },
        });
    }
    async getQueue(hospitalId, query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(50, Math.max(1, query.limit || 20));
        const skip = (page - 1) * limit;
        const filter = { hospitalId };
        if (query.status)
            filter.status = query.status;
        if (query.doctorId)
            filter.doctorId = query.doctorId;
        if (query.triagePriority)
            filter.triagePriority = query.triagePriority;
        const [encounters, total] = await Promise.all([
            OutpatientModel.find(filter)
                .populate('patientId', 'firstName lastName mrn gender dateOfBirth phone')
                .populate('doctorId', 'firstName lastName role department')
                .sort({ queuedAt: 1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            OutpatientModel.countDocuments(filter),
        ]);
        return {
            encounters: encounters,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getEncounterById(encounterId, hospitalId) {
        return OutpatientModel.findOne({
            _id: encounterId,
            hospitalId,
        })
            .populate('patientId', 'firstName lastName mrn gender dateOfBirth phone')
            .populate('doctorId', 'firstName lastName role department')
            .lean()
            .exec();
    }
    async recordVitals(encounterId, hospitalId, input) {
        const bmi = input.vitalSigns.height && input.vitalSigns.weight
            ? parseFloat((input.vitalSigns.weight /
                Math.pow(input.vitalSigns.height / 100, 2)).toFixed(2))
            : undefined;
        return OutpatientModel.findOneAndUpdate({
            _id: encounterId,
            hospitalId,
        }, {
            $set: {
                vitalSigns: {
                    ...input.vitalSigns,
                    bmi,
                },
                nursingNotes: input.nursingNotes,
                status: ConsultationStatus.WAITING_FOR_DOCTOR,
            },
        }, { new: true })
            .populate('patientId', 'firstName lastName mrn gender dateOfBirth phone')
            .populate('doctorId', 'firstName lastName role department')
            .lean()
            .exec();
    }
    async startConsultation(encounterId, hospitalId, doctorId) {
        return OutpatientModel.findOneAndUpdate({
            _id: encounterId,
            hospitalId,
        }, {
            $set: {
                doctorId,
                status: ConsultationStatus.IN_CONSULTATION,
                consultationStartedAt: new Date(),
            },
        }, { new: true })
            .populate('patientId', 'firstName lastName mrn gender dateOfBirth phone')
            .populate('doctorId', 'firstName lastName role department')
            .lean()
            .exec();
    }
    /**
     * Captures the outpatient consultation charge through the centralized
     * billing module. Billing failures are deliberately isolated from the
     * clinical workflow so a pricing/configuration problem never prevents
     * completion of the consultation.
     *
     * The Billing module resolves the current catalogue price using:
     * OUTPATIENT_CONSULTATION + hospital + department + service date.
     */
    async getPricingCatalogues(hospitalId, departmentId, search) {
        const { getPricingCatalogue } = await import('../billing/billing.service.js');
        return getPricingCatalogue(hospitalId, {
            departmentName: 'Outpatient',
            departmentId,
            code: OUTPATIENT_CONSULTATION_SERVICE_CODE,
            search,
            activeOnly: true,
            page: 1,
            limit: 100,
        });
    }
    async captureBilling(encounterId, hospitalId, chargedBy) {
        const encounter = await OutpatientModel.findOne({
            _id: encounterId,
            hospitalId,
        });
        if (!encounter)
            return null;
        if (encounter.billing?.status === BillingCaptureStatus.CAPTURED) {
            return this.getEncounterById(encounterId, hospitalId);
        }
        if (!encounter.patientId) {
            encounter.billing = {
                status: BillingCaptureStatus.FAILED,
                serviceCode: OUTPATIENT_CONSULTATION_SERVICE_CODE,
                error: 'Patient is missing from the outpatient encounter.',
            };
            await encounter.save();
            return this.getEncounterById(encounterId, hospitalId);
        }
        try {
            const charge = await createCharge({
                hospitalId,
                patientId: String(encounter.patientId),
                serviceCode: OUTPATIENT_CONSULTATION_SERVICE_CODE,
                catalogueItemId: encounter.pricingCatalogueItemId,
                description: 'Outpatient Consultation',
                category: ChargeCategory.CONSULTATION,
                sourceModule: BillingSourceModule.OUTPATIENT,
                sourceId: String(encounter._id),
                departmentId: encounter.departmentId
                    ? String(encounter.departmentId)
                    : undefined,
                chargedBy: chargedBy || (encounter.doctorId
                    ? String(encounter.doctorId)
                    : undefined),
                chargeDate: encounter.consultationEndedAt || new Date(),
                quantity: 1,
            });
            encounter.billing = {
                status: BillingCaptureStatus.CAPTURED,
                chargeId: charge._id,
                serviceCode: OUTPATIENT_CONSULTATION_SERVICE_CODE,
                catalogueItemId: encounter.pricingCatalogueItemId,
                cataloguePlanName: encounter.pricingCataloguePlanName,
                cataloguePrice: encounter.pricingCataloguePrice,
                catalogueVersion: encounter.pricingCatalogueVersion,
                catalogueCurrency: encounter.pricingCatalogueCurrency,
                capturedAt: new Date(),
            };
            await encounter.save();
        }
        catch (error) {
            encounter.billing = {
                status: BillingCaptureStatus.FAILED,
                serviceCode: OUTPATIENT_CONSULTATION_SERVICE_CODE,
                error: error?.message ||
                    'Unable to capture the outpatient consultation charge.',
            };
            await encounter.save();
        }
        return this.getEncounterById(encounterId, hospitalId);
    }
    async completeConsultation(encounterId, hospitalId, input, completedBy) {
        const updated = await OutpatientModel.findOneAndUpdate({
            _id: encounterId,
            hospitalId,
        }, {
            $set: {
                consultationNotes: input.consultationNotes,
                diagnoses: input.diagnoses || [],
                status: ConsultationStatus.COMPLETED,
                consultationEndedAt: new Date(),
            },
        }, { new: true })
            .lean()
            .exec();
        if (!updated)
            return null;
        // Billing is intentionally attempted after the clinical completion is
        // persisted. A billing/catalogue failure is recorded on the encounter
        // and does not roll back the completed consultation.
        return this.captureBilling(encounterId, hospitalId, completedBy);
    }
}
export const outpatientService = new OutpatientService();
