import { Types } from 'mongoose';
import { PreAuthModel } from './pre-authorizations.model.js';
import {
  CreatePreAuthInput,
  ReviewPreAuthInput,
  GetPreAuthQuery,
  IPreAuthDocument,
  PreAuthStatus,
} from './pre-authorizations.types.js';

export class PreAuthorizationsService {
  private generateRequestNumber(): string {
    const randomHex = Math.floor(100000 + Math.random() * 900000).toString();
    return `PA-${Date.now().toString().slice(-4)}-${randomHex}`;
  }

  public async createPreAuth(input: CreatePreAuthInput): Promise<IPreAuthDocument> {
    const totalRequested = input.procedures.reduce((acc, p) => acc + p.requestedAmount, 0);

    return PreAuthModel.create({
      ...input,
      hmoId: new Types.ObjectId(input.hmoId),
      memberId: new Types.ObjectId(input.memberId),
      providerId: new Types.ObjectId(input.providerId),
      requestNumber: this.generateRequestNumber(),
      status: PreAuthStatus.NEW_REQUEST,
      totalRequestedAmount: totalRequested,
      totalApprovedAmount: 0,
    });
  }

  public async getPreAuths(
    hmoId: string,
    query: GetPreAuthQuery
  ): Promise<{
    requests: IPreAuthDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hmoId };

    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.memberId) filter.memberId = query.memberId;
    if (query.providerId) filter.providerId = query.providerId;
    if (query.search) {
      filter.$or = [
        { requestNumber: { $regex: query.search, $options: 'i' } },
        { diagnosisCode: { $regex: query.search, $options: 'i' } },
        { diagnosisDescription: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [requests, total] = await Promise.all([
      PreAuthModel.find(filter)
        .populate('memberId', 'firstName lastName policyNumber email')
        .populate('providerId', 'name code category')
        .populate('reviewedBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      PreAuthModel.countDocuments(filter),
    ]);

    return {
      requests,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getPreAuthById(id: string, hmoId: string): Promise<IPreAuthDocument | null> {
    return PreAuthModel.findOne({ _id: id, hmoId })
      .populate('memberId')
      .populate('providerId')
      .populate('reviewedBy', 'firstName lastName email')
      .exec();
  }

  public async reviewPreAuth(
    id: string,
    hmoId: string,
    reviewerId: string,
    input: ReviewPreAuthInput
  ): Promise<IPreAuthDocument | null> {
    const preAuth = await PreAuthModel.findOne({ _id: id, hmoId });
    if (!preAuth) return null;

    if (input.procedures && input.procedures.length > 0) {
      let totalApproved = 0;
      preAuth.procedures = preAuth.procedures.map((proc: { code: string; approvedAmount?: number }) => {
        const matchingReview = input.procedures?.find((p) => p.code === proc.code);
        const approvedAmount = matchingReview ? matchingReview.approvedAmount : 0;
        totalApproved += approvedAmount;
        return { ...proc, approvedAmount };
      });
      preAuth.totalApprovedAmount = totalApproved;
    } else if (input.status === PreAuthStatus.APPROVED) {
      preAuth.procedures = preAuth.procedures.map((proc: { requestedAmount: number }) => ({
        ...proc,
        approvedAmount: proc.requestedAmount,
      }));
      preAuth.totalApprovedAmount = preAuth.totalRequestedAmount;
    }

    preAuth.status = input.status;
    preAuth.decisionReason = input.decisionReason;
    preAuth.reviewedBy = new Types.ObjectId(reviewerId);
    preAuth.reviewedAt = new Date();

    if (input.status === PreAuthStatus.APPROVED) {
      const days = input.expiresInDays || 30;
      preAuth.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    return preAuth.save();
  }

  public async getPreAuthStats(hmoId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [newRequests, pending, approvedToday, declined] = await Promise.all([
      PreAuthModel.countDocuments({ hmoId, status: PreAuthStatus.NEW_REQUEST }),
      PreAuthModel.countDocuments({ hmoId, status: PreAuthStatus.PENDING }),
      PreAuthModel.countDocuments({
        hmoId,
        status: PreAuthStatus.APPROVED,
        reviewedAt: { $gte: todayStart },
      }),
      PreAuthModel.countDocuments({ hmoId, status: PreAuthStatus.DECLINED }),
    ]);

    return {
      newRequests,
      pending,
      approvedToday,
      declined,
    };
  }
}

export const preAuthorizationsService = new PreAuthorizationsService();