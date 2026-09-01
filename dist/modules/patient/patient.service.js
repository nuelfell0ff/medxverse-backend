import mongoose, { Types } from 'mongoose';
import { PatientModel } from './patient.model.js';
export class PatientService {
    static generateMRN() {
        return `MRN-${Math.floor(100000 + Math.random() * 900000)}`;
    }
    static assertObjectId(value, fieldName) {
        if (!Types.ObjectId.isValid(value)) {
            const error = new Error(`Invalid ${fieldName}.`);
            error.statusCode = 400;
            throw error;
        }
    }
    static async registerPatient(hospitalId, dto) {
        this.assertObjectId(hospitalId, 'hospital ID');
        let mrn = this.generateMRN();
        while (await PatientModel.exists({ mrn })) {
            mrn = this.generateMRN();
        }
        const sanitizedData = { ...dto };
        for (const key of Object.keys(sanitizedData)) {
            if (sanitizedData[key] === '' || sanitizedData[key] === null || sanitizedData[key] === undefined) {
                delete sanitizedData[key];
            }
        }
        if (sanitizedData.gender) {
            sanitizedData.gender = String(sanitizedData.gender).toUpperCase();
        }
        const dob = new Date(sanitizedData.dateOfBirth);
        if (Number.isNaN(dob.getTime())) {
            const error = new Error('Invalid date of birth provided.');
            error.statusCode = 400;
            throw error;
        }
        if (sanitizedData.hmoId && !Types.ObjectId.isValid(String(sanitizedData.hmoId))) {
            const error = new Error('Invalid HMO provider ID.');
            error.statusCode = 400;
            throw error;
        }
        return PatientModel.create({
            ...sanitizedData,
            hospitalId: new Types.ObjectId(hospitalId),
            mrn,
            dateOfBirth: dob,
        });
    }
    static async getPatients(hospitalId, query) {
        this.assertObjectId(hospitalId, 'hospital ID');
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
        const skip = (page - 1) * limit;
        const filter = { hospitalId: new Types.ObjectId(hospitalId) };
        if (query.search?.trim()) {
            const escaped = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.$or = [
                { firstName: { $regex: escaped, $options: 'i' } },
                { lastName: { $regex: escaped, $options: 'i' } },
                { mrn: { $regex: escaped, $options: 'i' } },
                { phone: { $regex: escaped, $options: 'i' } },
            ];
        }
        const [patients, total] = await Promise.all([
            PatientModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
            PatientModel.countDocuments(filter).exec(),
        ]);
        return { patients, total, page, limit, pages: Math.ceil(total / limit) };
    }
    static async getPatientById(hospitalId, patientId) {
        this.assertObjectId(hospitalId, 'hospital ID');
        this.assertObjectId(patientId, 'patient ID');
        const patient = await PatientModel.findOne({
            _id: new Types.ObjectId(patientId),
            hospitalId: new Types.ObjectId(hospitalId),
        }).exec();
        if (!patient) {
            const error = new Error('Patient record not found.');
            error.statusCode = 404;
            throw error;
        }
        return patient;
    }
    static async addVitals(hospitalId, patientId, userId, dto) {
        this.assertObjectId(userId, 'user ID');
        const patient = await this.getPatientById(hospitalId, patientId);
        patient.vitalsHistory.push({
            ...dto,
            recordedBy: new Types.ObjectId(userId),
            recordedAt: new Date(),
        });
        await patient.save();
        return patient;
    }
    /**
     * Returns only the clinically useful summary from each department.
     * The department remains the owner of the complete record.
     *
     * Models are discovered at runtime so Patient does not create compile-time
     * dependencies on every department's implementation.
     */
    static async getPatientClinicalSummary(hospitalId, patientId) {
        const patient = await this.getPatientById(hospitalId, patientId);
        const [surgery, radiology, laboratory, pharmacy, outpatient, billing] = await Promise.all([
            this.getDepartmentSummary('surgery', hospitalId, patientId),
            this.getDepartmentSummary('radiology', hospitalId, patientId),
            this.getDepartmentSummary('laboratory', hospitalId, patientId),
            this.getDepartmentSummary('pharmacy', hospitalId, patientId),
            this.getDepartmentSummary('outpatient', hospitalId, patientId),
            this.getBillingSummary(hospitalId, patientId),
        ]);
        return {
            ...patient.toObject(),
            clinicalSummary: {
                surgery,
                radiology,
                laboratory,
                pharmacy,
                outpatient,
                billing,
            },
        };
    }
    static getRegisteredModel(names) {
        for (const name of names) {
            const registered = mongoose.models[name];
            if (registered)
                return registered;
        }
        return null;
    }
    static async getDepartmentSummary(department, hospitalId, patientId) {
        const modelNames = {
            surgery: ['Surgery', 'SurgeryRecord', 'SurgicalProcedure'],
            radiology: ['RadiologyOrder', 'Radiology'],
            laboratory: ['LabTest', 'LaboratoryTest', 'Laboratory', 'LabOrder'],
            pharmacy: ['PharmacyDispense', 'PharmacyPrescription', 'Prescription', 'Dispense'],
            outpatient: ['Outpatient', 'OutpatientEncounter', 'Consultation'],
        };
        const model = this.getRegisteredModel(modelNames[department]);
        if (!model)
            return [];
        try {
            const rows = await model
                .find({
                hospitalId: new Types.ObjectId(hospitalId),
                patientId: new Types.ObjectId(patientId),
            })
                .sort({ createdAt: -1 })
                .limit(50)
                .lean()
                .exec();
            return rows.map((row) => this.toDepartmentSummary(department, row));
        }
        catch {
            // A missing/changed department schema must not make the Patient page fail.
            return [];
        }
    }
    static toDepartmentSummary(department, row) {
        const id = row._id ? String(row._id) : undefined;
        const date = row.createdAt ||
            row.updatedAt ||
            row.consultationEndedAt ||
            row.performedAt ||
            row.completedAt ||
            row.reportedAt ||
            row.date;
        if (department === 'surgery') {
            const procedure = row.procedureName ||
                row.procedure ||
                row.procedureType ||
                row.name ||
                'Surgical procedure';
            const surgeon = row.surgeonName ||
                row.surgeon?.name ||
                row.surgeonId ||
                row.surgeon;
            const diagnosis = row.diagnosis ||
                row.diagnoses?.[0] ||
                row.preoperativeDiagnosis ||
                row.postoperativeDiagnosis;
            return {
                id,
                date,
                title: String(procedure),
                status: row.status,
                summary: row.operatingReport || row.operativeReport || row.notes,
                details: {
                    surgeon,
                    diagnosis,
                },
            };
        }
        if (department === 'radiology') {
            const title = row.procedureName ||
                row.modality ||
                row.examName ||
                row.studyName ||
                row.bodyPart ||
                'Radiology investigation';
            return {
                id,
                date: row.reportedAt || row.scheduling?.scheduledDate || date,
                title: String(title),
                status: row.status,
                summary: row.impression ||
                    row.report?.impression ||
                    row.findings ||
                    row.report?.findings,
                details: {
                    accessionNumber: row.accessionNumber,
                    clinicalIndication: row.clinicalIndication,
                },
            };
        }
        if (department === 'laboratory') {
            const title = row.testName ||
                row.test?.name ||
                row.name ||
                row.testCode ||
                row.panelName ||
                'Laboratory test';
            return {
                id,
                date,
                title: String(title),
                status: row.status || row.resultStatus,
                summary: row.resultSummary ||
                    row.result ||
                    row.interpretation ||
                    row.notes,
                details: {
                    result: row.result,
                    unit: row.unit,
                    referenceRange: row.referenceRange,
                    abnormal: row.abnormal,
                    critical: row.critical,
                },
            };
        }
        if (department === 'pharmacy') {
            const medication = row.medicationName ||
                row.drugName ||
                row.medicineName ||
                row.drug?.name ||
                row.medication?.name ||
                row.name ||
                'Medication';
            return {
                id,
                date: row.dispensedAt || row.prescribedAt || date,
                title: String(medication),
                status: row.status,
                summary: row.directions || row.dosage || row.instructions,
                details: {
                    dose: row.dose,
                    frequency: row.frequency,
                    quantity: row.quantity,
                    dispenseQuantity: row.dispenseQuantity,
                },
            };
        }
        const title = row.reasonForVisit ||
            row.visitReason ||
            row.consultationType ||
            row.serviceName ||
            'Outpatient consultation';
        return {
            id,
            date: row.consultationEndedAt || row.consultationStartedAt || date,
            title: String(title),
            status: row.status,
            summary: row.assessment ||
                row.consultationNotes ||
                row.clinicalNotes ||
                row.plan,
            details: {
                diagnoses: row.diagnoses,
                doctorId: row.doctorId,
            },
        };
    }
    static async getBillingSummary(hospitalId, patientId) {
        const model = this.getRegisteredModel([
            'Charge',
            'BillingCharge',
            'PaymentCharge',
        ]);
        if (!model) {
            return { totalCharges: 0, totalPaid: 0, balance: 0, items: [] };
        }
        try {
            const rows = await model
                .find({
                hospitalId: new Types.ObjectId(hospitalId),
                patientId: new Types.ObjectId(patientId),
            })
                .sort({ createdAt: -1 })
                .limit(100)
                .lean()
                .exec();
            const totalCharges = rows.reduce((sum, row) => sum +
                this.toNumber(row.totalAmount ??
                    row.amount ??
                    row.chargeAmount ??
                    row.price ??
                    row.total), 0);
            const totalPaid = rows.reduce((sum, row) => sum +
                this.toNumber(row.amountPaid ??
                    row.paidAmount ??
                    row.paid ??
                    row.paymentAmount), 0);
            const items = rows.map((row) => {
                const amount = this.toNumber(row.totalAmount ??
                    row.amount ??
                    row.chargeAmount ??
                    row.price ??
                    row.total);
                const paid = this.toNumber(row.amountPaid ??
                    row.paidAmount ??
                    row.paid ??
                    row.paymentAmount);
                return {
                    id: row._id ? String(row._id) : undefined,
                    date: row.chargeDate || row.createdAt,
                    title: row.description ||
                        row.serviceName ||
                        row.cataloguePlanName ||
                        row.serviceCode ||
                        'Patient charge',
                    status: row.status,
                    summary: `Charged: ${amount}; Paid: ${paid}; Balance: ${Math.max(0, amount - paid)}`,
                    details: {
                        amount,
                        paid,
                        balance: Math.max(0, amount - paid),
                        serviceCode: row.serviceCode,
                        sourceModule: row.sourceModule,
                    },
                };
            });
            return {
                totalCharges,
                totalPaid,
                balance: Math.max(0, totalCharges - totalPaid),
                items,
            };
        }
        catch {
            return { totalCharges: 0, totalPaid: 0, balance: 0, items: [] };
        }
    }
    static toNumber(value) {
        if (typeof value === 'number' && Number.isFinite(value))
            return value;
        if (typeof value === 'string') {
            const parsed = Number(value.replace(/,/g, ''));
            return Number.isFinite(parsed) ? parsed : 0;
        }
        if (value && typeof value === 'object' && 'valueOf' in value) {
            const parsed = Number(value.valueOf());
            return Number.isFinite(parsed) ? parsed : 0;
        }
        return 0;
    }
}
