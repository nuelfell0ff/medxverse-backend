import { Types } from 'mongoose';
import { BranchModel, RoleModel, AuditEventModel, DeviceSessionModel } from './administration.model.js';
import {
  CreateBranchInput,
  CreateRoleInput,
  LogAuditEventInput,
  GetAuditLogsQuery,
  IBranchDocument,
  IRoleDocument,
  IAuditEventDocument,
  IDeviceSessionDocument,
} from './administration.types.js';

export class AdministrationService {
  public async createBranch(input: CreateBranchInput): Promise<IBranchDocument> {
    return BranchModel.create({
      ...input,
      hospitalId: new Types.ObjectId(input.hospitalId),
    });
  }

  public async getBranches(hospitalId: string): Promise<IBranchDocument[]> {
    return BranchModel.find({ hospitalId, isActive: true }).sort({ name: 1 }).exec();
  }

  public async createRole(input: CreateRoleInput): Promise<IRoleDocument> {
    return RoleModel.create({
      ...input,
      hospitalId: new Types.ObjectId(input.hospitalId),
    });
  }

  public async getRoles(hospitalId: string): Promise<IRoleDocument[]> {
    return RoleModel.find({ hospitalId }).sort({ name: 1 }).exec();
  }

  public async logAuditEvent(input: LogAuditEventInput): Promise<IAuditEventDocument> {
    return AuditEventModel.create({
      ...input,
      hospitalId: new Types.ObjectId(input.hospitalId),
      userId: new Types.ObjectId(input.userId),
    });
  }

  public async getAuditLogs(
    hospitalId: string,
    query: GetAuditLogsQuery
  ): Promise<{ logs: IAuditEventDocument[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 50));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hospitalId };

    if (query.userId) filter.userId = query.userId;
    if (query.action) filter.action = query.action;
    if (query.resource) filter.resource = query.resource;

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

  public async getUserDeviceSessions(
    userId: string,
    hospitalId: string
  ): Promise<IDeviceSessionDocument[]> {
    return DeviceSessionModel.find({ userId, hospitalId, isRevoked: false })
      .sort({ lastActiveAt: -1 })
      .exec();
  }

  public async revokeDeviceSession(sessionId: string, hospitalId: string): Promise<boolean> {
    const result = await DeviceSessionModel.updateOne(
      { _id: sessionId, hospitalId },
      { $set: { isRevoked: true } }
    ).exec();

    return result.modifiedCount > 0;
  }
}

export const administrationService = new AdministrationService();