import { OutpatientModel } from './outpatient.model.js';
import { ConsultationStatus, } from './outpatient.types.js';
export class OutpatientService {
    async createEncounter(input) {
        return OutpatientModel.create({
            ...input,
            status: ConsultationStatus.IN_QUEUE,
            queuedAt: new Date(),
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
                .populate('patientId', 'firstName lastName mrn gender dateOfBirth')
                .populate('doctorId', 'firstName lastName role')
                .sort({ queuedAt: 1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            OutpatientModel.countDocuments(filter),
        ]);
        return {
            encounters,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    async recordVitals(encounterId, hospitalId, input) {
        const bmi = input.vitalSigns.height && input.vitalSigns.weight
            ? parseFloat((input.vitalSigns.weight / Math.pow(input.vitalSigns.height / 100, 2)).toFixed(2))
            : undefined;
        return OutpatientModel.findOneAndUpdate({ _id: encounterId, hospitalId }, {
            $set: {
                vitalSigns: { ...input.vitalSigns, bmi },
                nursingNotes: input.nursingNotes,
                status: ConsultationStatus.WAITING_FOR_DOCTOR,
            },
        }, { new: true }).exec();
    }
    async startConsultation(encounterId, hospitalId, doctorId) {
        return OutpatientModel.findOneAndUpdate({ _id: encounterId, hospitalId }, {
            $set: {
                doctorId,
                status: ConsultationStatus.IN_CONSULTATION,
                consultationStartedAt: new Date(),
            },
        }, { new: true }).exec();
    }
    async completeConsultation(encounterId, hospitalId, input) {
        return OutpatientModel.findOneAndUpdate({ _id: encounterId, hospitalId }, {
            $set: {
                consultationNotes: input.consultationNotes,
                diagnoses: input.diagnoses || [],
                status: ConsultationStatus.COMPLETED,
                consultationEndedAt: new Date(),
            },
        }, { new: true }).exec();
    }
}
export const outpatientService = new OutpatientService();
