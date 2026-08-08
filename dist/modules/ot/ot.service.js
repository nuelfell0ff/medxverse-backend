import { Types } from 'mongoose';
import { SurgicalCaseModel } from './ot.model.js';
import { SurgeryStatus, } from './ot.types.js';
export class OTService {
    async createCase(input) {
        const surgicalTeam = input.surgicalTeam.map((member) => ({
            userId: new Types.ObjectId(member.userId),
            role: member.role,
        }));
        return SurgicalCaseModel.create({
            ...input,
            hospitalId: new Types.ObjectId(input.hospitalId),
            patientId: new Types.ObjectId(input.patientId),
            surgicalTeam,
            createdById: new Types.ObjectId(input.createdById),
            scheduledStartTime: new Date(input.scheduledStartTime),
            scheduledEndTime: input.scheduledEndTime ? new Date(input.scheduledEndTime) : undefined,
        });
    }
    async getCases(hospitalId, query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(50, Math.max(1, query.limit || 20));
        const skip = (page - 1) * limit;
        const filter = { hospitalId };
        if (query.status)
            filter.status = query.status;
        if (query.urgency)
            filter.urgency = query.urgency;
        if (query.otRoomNumber)
            filter.otRoomNumber = { $regex: query.otRoomNumber, $options: 'i' };
        if (query.patientId)
            filter.patientId = query.patientId;
        if (query.startDate || query.endDate) {
            filter.scheduledStartTime = {};
            if (query.startDate) {
                filter.scheduledStartTime.$gte = new Date(query.startDate);
            }
            if (query.endDate) {
                filter.scheduledStartTime.$lte = new Date(query.endDate);
            }
        }
        const [cases, total] = await Promise.all([
            SurgicalCaseModel.find(filter)
                .populate('patientId', 'firstName lastName mrn dateOfBirth gender bloodGroup')
                .populate('surgicalTeam.userId', 'firstName lastName role specialization')
                .populate('createdById', 'firstName lastName role')
                .sort({ scheduledStartTime: 1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            SurgicalCaseModel.countDocuments(filter),
        ]);
        return {
            cases,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getCaseById(caseId, hospitalId) {
        return SurgicalCaseModel.findOne({ _id: caseId, hospitalId })
            .populate('patientId', 'firstName lastName mrn dateOfBirth gender bloodGroup phone allergies')
            .populate('surgicalTeam.userId', 'firstName lastName role specialization')
            .populate('createdById', 'firstName lastName role')
            .exec();
    }
    async updateStatus(caseId, hospitalId, input) {
        const updateData = {
            status: input.status,
        };
        if (input.status === SurgeryStatus.IN_PROGRESS) {
            updateData.actualStartTime = input.actualStartTime || new Date();
        }
        if (input.status === SurgeryStatus.COMPLETED) {
            updateData.actualEndTime = input.actualEndTime || new Date();
        }
        return SurgicalCaseModel.findOneAndUpdate({ _id: caseId, hospitalId }, { $set: updateData }, { new: true }).exec();
    }
    async updateSurgicalTeam(caseId, hospitalId, input) {
        const surgicalTeam = input.surgicalTeam.map((member) => ({
            userId: new Types.ObjectId(member.userId),
            role: member.role,
        }));
        return SurgicalCaseModel.findOneAndUpdate({ _id: caseId, hospitalId }, { $set: { surgicalTeam } }, { new: true }).exec();
    }
    async updatePostOpNotes(caseId, hospitalId, input) {
        return SurgicalCaseModel.findOneAndUpdate({ _id: caseId, hospitalId }, { $set: { postOpNotes: input.postOpNotes } }, { new: true }).exec();
    }
}
export const otService = new OTService();
