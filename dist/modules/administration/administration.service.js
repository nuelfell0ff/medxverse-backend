import { Types } from 'mongoose';
import { BranchModel, RoleModel, AuditEventModel, DeviceSessionModel } from './administration.model.js';
export class AdministrationService {
    async createBranch(input) {
        return BranchModel.create({
            ...input,
            hospitalId: new Types.ObjectId(input.hospitalId),
        });
    }
    async getBranches(hospitalId) {
        return BranchModel.find({ hospitalId, isActive: true }).sort({ name: 1 }).exec();
    }
    async createRole(input) {
        return RoleModel.create({
            ...input,
            hospitalId: new Types.ObjectId(input.hospitalId),
        });
    }
    async getRoles(hospitalId) {
        return RoleModel.find({ hospitalId }).sort({ name: 1 }).exec();
    }
    async logAuditEvent(input) {
        return AuditEventModel.create({
            ...input,
            hospitalId: new Types.ObjectId(input.hospitalId),
            userId: new Types.ObjectId(input.userId),
        });
    }
    async getAuditLogs(hospitalId, query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(100, Math.max(1, query.limit || 50));
        const skip = (page - 1) * limit;
        const filter = { hospitalId };
        if (query.userId)
            filter.userId = query.userId;
        if (query.action)
            filter.action = query.action;
        if (query.resource)
            filter.resource = query.resource;
        const [logs, total] = await Promise.all([
            AuditEventModel.find(filter)
                .populate('userId', 'firstName lastName email role')
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            AuditEventModel.countDocuments(filter),
        ]);
        return {
            logs,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getUserDeviceSessions(userId, hospitalId) {
        return DeviceSessionModel.find({ userId, hospitalId, isRevoked: false })
            .sort({ lastActiveAt: -1 })
            .exec();
    }
    async revokeDeviceSession(sessionId, hospitalId) {
        const result = await DeviceSessionModel.updateOne({ _id: sessionId, hospitalId }, { $set: { isRevoked: true } }).exec();
        return result.modifiedCount > 0;
    }
}
export const administrationService = new AdministrationService();
