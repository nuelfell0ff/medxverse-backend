import { Types } from 'mongoose';
import { EyeExamModel, OpticalPrescriptionModel } from './eye-clinic.model.js';
export class EyeClinicService {
    async createEyeExam(input) {
        return EyeExamModel.create({
            ...input,
            hospitalId: new Types.ObjectId(input.hospitalId),
            patientId: new Types.ObjectId(input.patientId),
            examinerId: new Types.ObjectId(input.examinerId),
        });
    }
    async getEyeExams(hospitalId, query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(50, Math.max(1, query.limit || 20));
        const skip = (page - 1) * limit;
        const filter = { hospitalId };
        if (query.patientId)
            filter.patientId = query.patientId;
        if (query.examinerId)
            filter.examinerId = query.examinerId;
        if (query.examType)
            filter.examType = query.examType;
        const [exams, total] = await Promise.all([
            EyeExamModel.find(filter)
                .populate('patientId', 'firstName lastName mrn dateOfBirth gender')
                .populate('examinerId', 'firstName lastName role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            EyeExamModel.countDocuments(filter),
        ]);
        return {
            exams,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getEyeExamById(examId, hospitalId) {
        return EyeExamModel.findOne({ _id: examId, hospitalId })
            .populate('patientId', 'firstName lastName mrn dateOfBirth gender phone')
            .populate('examinerId', 'firstName lastName role')
            .exec();
    }
    async createOpticalPrescription(input) {
        // Inactivate older active prescriptions for this patient of the same type
        await OpticalPrescriptionModel.updateMany({
            hospitalId: new Types.ObjectId(input.hospitalId),
            patientId: new Types.ObjectId(input.patientId),
            prescriptionType: input.prescriptionType,
            isActive: true,
        }, { $set: { isActive: false } });
        return OpticalPrescriptionModel.create({
            ...input,
            hospitalId: new Types.ObjectId(input.hospitalId),
            patientId: new Types.ObjectId(input.patientId),
            prescribedById: new Types.ObjectId(input.prescribedById),
            examId: input.examId ? new Types.ObjectId(input.examId) : undefined,
            expirationDate: new Date(input.expirationDate),
            isActive: true,
        });
    }
    async getOpticalPrescriptions(hospitalId, query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(50, Math.max(1, query.limit || 20));
        const skip = (page - 1) * limit;
        const filter = { hospitalId };
        if (query.patientId)
            filter.patientId = query.patientId;
        if (query.prescribedById)
            filter.prescribedById = query.prescribedById;
        if (query.prescriptionType)
            filter.prescriptionType = query.prescriptionType;
        if (query.isActive !== undefined)
            filter.isActive = query.isActive;
        const [prescriptions, total] = await Promise.all([
            OpticalPrescriptionModel.find(filter)
                .populate('patientId', 'firstName lastName mrn dateOfBirth gender')
                .populate('prescribedById', 'firstName lastName role')
                .populate('examId', 'examType createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            OpticalPrescriptionModel.countDocuments(filter),
        ]);
        return {
            prescriptions,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getOpticalPrescriptionById(prescriptionId, hospitalId) {
        return OpticalPrescriptionModel.findOne({ _id: prescriptionId, hospitalId })
            .populate('patientId', 'firstName lastName mrn dateOfBirth gender phone')
            .populate('prescribedById', 'firstName lastName role')
            .populate('examId')
            .exec();
    }
}
export const eyeClinicService = new EyeClinicService();
