import { Types } from 'mongoose';
import { BloodUnitModel, TransfusionRequestModel } from './blood-bank.model.js';
import { TransfusionRequestStatus, BloodUnitStatus, } from './blood-bank.types.js';
export class BloodBankService {
    async addBloodUnit(input) {
        return BloodUnitModel.create({
            ...input,
            hospitalId: new Types.ObjectId(input.hospitalId),
            donorId: input.donorId ? new Types.ObjectId(input.donorId) : undefined,
            collectionDate: new Date(input.collectionDate),
            expiryDate: new Date(input.expiryDate),
        });
    }
    async getBloodUnits(hospitalId, query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(50, Math.max(1, query.limit || 20));
        const skip = (page - 1) * limit;
        const filter = { hospitalId };
        if (query.bloodGroup)
            filter.bloodGroup = query.bloodGroup;
        if (query.componentType)
            filter.componentType = query.componentType;
        if (query.status)
            filter.status = query.status;
        if (query.unitNumber)
            filter.unitNumber = { $regex: query.unitNumber, $options: 'i' };
        const [units, total] = await Promise.all([
            BloodUnitModel.find(filter)
                .populate('donorId', 'firstName lastName phone')
                .sort({ expiryDate: 1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            BloodUnitModel.countDocuments(filter),
        ]);
        return {
            units,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    async createTransfusionRequest(input) {
        return TransfusionRequestModel.create({
            ...input,
            hospitalId: new Types.ObjectId(input.hospitalId),
            patientId: new Types.ObjectId(input.patientId),
            requestedById: new Types.ObjectId(input.requestedById),
        });
    }
    async getTransfusionRequests(hospitalId, query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(50, Math.max(1, query.limit || 20));
        const skip = (page - 1) * limit;
        const filter = { hospitalId };
        if (query.status)
            filter.status = query.status;
        if (query.urgency)
            filter.urgency = query.urgency;
        if (query.patientId)
            filter.patientId = query.patientId;
        if (query.bloodGroup)
            filter.bloodGroup = query.bloodGroup;
        const [requests, total] = await Promise.all([
            TransfusionRequestModel.find(filter)
                .populate('patientId', 'firstName lastName mrn dateOfBirth gender bloodGroup')
                .populate('requestedById', 'firstName lastName role')
                .populate('assignedUnitIds', 'unitNumber bloodGroup componentType expiryDate status')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            TransfusionRequestModel.countDocuments(filter),
        ]);
        return {
            requests,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getTransfusionRequestById(requestId, hospitalId) {
        return TransfusionRequestModel.findOne({ _id: requestId, hospitalId })
            .populate('patientId', 'firstName lastName mrn dateOfBirth gender bloodGroup phone')
            .populate('requestedById', 'firstName lastName role')
            .populate('assignedUnitIds', 'unitNumber bloodGroup componentType expiryDate status volumeMl')
            .exec();
    }
    async updateCrossmatch(requestId, hospitalId, input) {
        const assignedUnitObjectIds = input.assignedUnitIds?.map((id) => new Types.ObjectId(id));
        const updated = await TransfusionRequestModel.findOneAndUpdate({ _id: requestId, hospitalId }, {
            $set: {
                crossmatchResult: input.crossmatchResult,
                status: TransfusionRequestStatus.CROSSMATCHED,
                ...(assignedUnitObjectIds ? { assignedUnitIds: assignedUnitObjectIds } : {}),
                ...(input.notes ? { notes: input.notes } : {}),
            },
        }, { new: true }).exec();
        if (updated && assignedUnitObjectIds && assignedUnitObjectIds.length > 0) {
            await BloodUnitModel.updateMany({ _id: { $in: assignedUnitObjectIds }, hospitalId }, { $set: { status: BloodUnitStatus.RESERVED } });
        }
        return updated;
    }
    async updateRequestStatus(requestId, hospitalId, input) {
        const request = await TransfusionRequestModel.findOne({ _id: requestId, hospitalId });
        if (!request)
            return null;
        request.status = input.status;
        if (input.notes)
            request.notes = input.notes;
        if (input.status === TransfusionRequestStatus.COMPLETED && request.assignedUnitIds.length > 0) {
            await BloodUnitModel.updateMany({ _id: { $in: request.assignedUnitIds }, hospitalId }, { $set: { status: BloodUnitStatus.TRANSFUSED } });
        }
        else if ((input.status === TransfusionRequestStatus.CANCELLED ||
            input.status === TransfusionRequestStatus.REJECTED) &&
            request.assignedUnitIds.length > 0) {
            await BloodUnitModel.updateMany({ _id: { $in: request.assignedUnitIds }, hospitalId }, { $set: { status: BloodUnitStatus.AVAILABLE } });
        }
        await request.save();
        return request;
    }
}
export const bloodBankService = new BloodBankService();
