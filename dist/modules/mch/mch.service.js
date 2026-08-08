import { Types } from 'mongoose';
import { MchRecordModel } from './mch.model.js';
import { PregnancyStatus, } from './mch.types.js';
export class MchService {
    async createRecord(input) {
        return MchRecordModel.create({
            ...input,
            pregnancyStatus: input.careType === 'ANTENATAL' ? PregnancyStatus.ACTIVE : undefined,
            isActive: true,
        });
    }
    async getRecords(hospitalId, query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(50, Math.max(1, query.limit || 20));
        const skip = (page - 1) * limit;
        const filter = { hospitalId, isActive: true };
        if (query.careType)
            filter.careType = query.careType;
        if (query.patientId)
            filter.patientId = query.patientId;
        if (query.pregnancyStatus)
            filter.pregnancyStatus = query.pregnancyStatus;
        const [records, total] = await Promise.all([
            MchRecordModel.find(filter)
                .populate('patientId', 'firstName lastName mrn dateOfBirth gender phone')
                .populate('ancVisits.attendingStaffId', 'firstName lastName role')
                .populate('pncVisits.attendingStaffId', 'firstName lastName role')
                .populate('immunizations.administeredBy', 'firstName lastName role')
                .populate('deliveryRecord.deliveredBy', 'firstName lastName role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            MchRecordModel.countDocuments(filter),
        ]);
        return {
            records,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getRecordById(recordId, hospitalId) {
        return MchRecordModel.findOne({ _id: recordId, hospitalId, isActive: true })
            .populate('patientId', 'firstName lastName mrn dateOfBirth gender phone')
            .populate('ancVisits.attendingStaffId', 'firstName lastName role')
            .populate('pncVisits.attendingStaffId', 'firstName lastName role')
            .populate('immunizations.administeredBy', 'firstName lastName role')
            .populate('deliveryRecord.deliveredBy', 'firstName lastName role')
            .exec();
    }
    async addAncVisit(recordId, hospitalId, input) {
        const ancEntry = {
            ...input,
            visitDate: new Date(),
            attendingStaffId: new Types.ObjectId(input.attendingStaffId),
        };
        return MchRecordModel.findOneAndUpdate({ _id: recordId, hospitalId, isActive: true }, { $push: { ancVisits: ancEntry } }, { new: true }).exec();
    }
    async recordDelivery(recordId, hospitalId, input) {
        const deliveryRecord = {
            ...input,
            deliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : new Date(),
            deliveredBy: new Types.ObjectId(input.deliveredBy),
        };
        return MchRecordModel.findOneAndUpdate({ _id: recordId, hospitalId, isActive: true }, {
            $set: {
                deliveryRecord,
                pregnancyStatus: PregnancyStatus.DELIVERED,
            },
        }, { new: true }).exec();
    }
    async addImmunization(recordId, hospitalId, input) {
        const immunizationEntry = {
            ...input,
            administeredAt: new Date(),
            administeredBy: new Types.ObjectId(input.administeredBy),
            nextDueDate: input.nextDueDate ? new Date(input.nextDueDate) : undefined,
        };
        return MchRecordModel.findOneAndUpdate({ _id: recordId, hospitalId, isActive: true }, { $push: { immunizations: immunizationEntry } }, { new: true }).exec();
    }
}
export const mchService = new MchService();
