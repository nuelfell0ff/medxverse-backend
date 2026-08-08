import { Types } from 'mongoose';
import { ICUAdmissionModel } from './icu.model.js';
import { ICUCaseStatus, } from './icu.types.js';
export class ICUService {
    async createAdmission(input) {
        return ICUAdmissionModel.create({
            ...input,
            hospitalId: new Types.ObjectId(input.hospitalId),
            patientId: new Types.ObjectId(input.patientId),
            attendingPhysicianId: input.attendingPhysicianId
                ? new Types.ObjectId(input.attendingPhysicianId)
                : undefined,
            admittedById: new Types.ObjectId(input.admittedById),
        });
    }
    async getAdmissions(hospitalId, query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(50, Math.max(1, query.limit || 20));
        const skip = (page - 1) * limit;
        const filter = { hospitalId };
        if (query.status)
            filter.status = query.status;
        if (query.careLevel)
            filter.careLevel = query.careLevel;
        if (query.patientId)
            filter.patientId = query.patientId;
        if (query.bedNumber)
            filter.bedNumber = { $regex: query.bedNumber, $options: 'i' };
        const [admissions, total] = await Promise.all([
            ICUAdmissionModel.find(filter)
                .populate('patientId', 'firstName lastName mrn dateOfBirth gender bloodGroup')
                .populate('attendingPhysicianId', 'firstName lastName role')
                .populate('admittedById', 'firstName lastName role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            ICUAdmissionModel.countDocuments(filter),
        ]);
        return {
            admissions,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getAdmissionById(admissionId, hospitalId) {
        return ICUAdmissionModel.findOne({ _id: admissionId, hospitalId })
            .populate('patientId', 'firstName lastName mrn dateOfBirth gender bloodGroup phone')
            .populate('attendingPhysicianId', 'firstName lastName role')
            .populate('admittedById', 'firstName lastName role')
            .populate('transferredToWardId', 'name wardNumber')
            .exec();
    }
    async updateVitals(admissionId, hospitalId, input) {
        return ICUAdmissionModel.findOneAndUpdate({ _id: admissionId, hospitalId }, { $set: { vitals: input.vitals } }, { new: true }).exec();
    }
    async updateVentilatorSettings(admissionId, hospitalId, input) {
        return ICUAdmissionModel.findOneAndUpdate({ _id: admissionId, hospitalId }, { $set: { ventilatorSettings: input.ventilatorSettings } }, { new: true }).exec();
    }
    async updateStatus(admissionId, hospitalId, input) {
        const updateData = {
            status: input.status,
        };
        if (input.dispositionNotes)
            updateData.dispositionNotes = input.dispositionNotes;
        if (input.transferredToWardId) {
            updateData.transferredToWardId = new Types.ObjectId(input.transferredToWardId);
        }
        if (input.status === ICUCaseStatus.DISCHARGED ||
            input.status === ICUCaseStatus.TRANSFERRED_OUT ||
            input.status === ICUCaseStatus.DECEASED) {
            updateData.dischargedAt = input.dischargedAt || new Date();
        }
        return ICUAdmissionModel.findOneAndUpdate({ _id: admissionId, hospitalId }, { $set: updateData }, { new: true }).exec();
    }
}
export const icuService = new ICUService();
