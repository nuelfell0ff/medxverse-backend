import { Types } from 'mongoose';
import { ClaimModel } from './claims.model.js';
import {
  ClaimQueryFilters,
  CreateClaimInput,
  IClaimDocument,
  IClaimItem,
  PaginatedClaimsResult,
  UpdateClaimStatusInput,
} from './claims.types.js';

export class ClaimsService {
  public async createClaim(
    hmoId: string,
    input: CreateClaimInput
  ): Promise<IClaimDocument> {
    const formattedItems = input.items.map((item) => {
      const claimedAmount = item.quantity * item.unitPrice;
      return {
        ...item,
        claimedAmount,
      };
    });

    const totalClaimedAmount = formattedItems.reduce(
      (sum, item) => sum + item.claimedAmount,
      0
    );

    const claimData = {
      ...input,
      hmoId: new Types.ObjectId(hmoId),
      memberId: new Types.ObjectId(input.memberId),
      providerId: new Types.ObjectId(input.providerId),
      items: formattedItems,
      totalClaimedAmount,
      status: 'SUBMITTED',
      submissionDate: new Date(),
    };

    return await ClaimModel.create(claimData);
  }

  public async getClaims(
    hmoId: string,
    filters: ClaimQueryFilters
  ): Promise<PaginatedClaimsResult> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      hmoId: new Types.ObjectId(hmoId),
    };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.memberId) {
      query.memberId = new Types.ObjectId(filters.memberId);
    }

    if (filters.providerId) {
      query.providerId = new Types.ObjectId(filters.providerId);
    }

    if (filters.startDate || filters.endDate) {
      query.treatmentDate = {};
      if (filters.startDate) {
        (query.treatmentDate as Record<string, unknown>).$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        (query.treatmentDate as Record<string, unknown>).$lte = new Date(filters.endDate);
      }
    }

    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [
        { claimNumber: searchRegex },
        { diagnosis: searchRegex },
        { icdCode: searchRegex },
      ];
    }

    const [claims, total] = await Promise.all([
      ClaimModel.find(query)
        .populate('memberId', 'firstName lastName policyNumber email phone')
        .populate('providerId', 'name code state')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      ClaimModel.countDocuments(query),
    ]);

    return {
      claims,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getClaimById(id: string, hmoId: string): Promise<IClaimDocument | null> {
    return await ClaimModel.findOne({
      _id: new Types.ObjectId(id),
      hmoId: new Types.ObjectId(hmoId),
    })
      .populate('memberId')
      .populate('providerId')
      .populate('adjudicatedBy', 'firstName lastName email')
      .exec();
  }

  public async updateClaimStatus(
    id: string,
    hmoId: string,
    userId: string,
    input: UpdateClaimStatusInput
  ): Promise<IClaimDocument | null> {
    const claim = await ClaimModel.findOne({
      _id: new Types.ObjectId(id),
      hmoId: new Types.ObjectId(hmoId),
    });

    if (!claim) return null;

    claim.status = input.status;
    claim.adjudicatedBy = new Types.ObjectId(userId);
    claim.adjudicatedAt = new Date();

    if (input.rejectionReason) {
      claim.rejectionReason = input.rejectionReason;
    }

    if (input.notes) {
      claim.notes = input.notes;
    }

    if (input.status === 'APPROVED' && input.approvedItems) {
      let totalApproved = 0;
      input.approvedItems.forEach(({ itemIndex, approvedAmount }) => {
        if (claim.items[itemIndex]) {
          claim.items[itemIndex].approvedAmount = approvedAmount;
          totalApproved += approvedAmount;
        }
      });
      claim.totalApprovedAmount = totalApproved;
    } else if (input.status === 'APPROVED' && !input.approvedItems) {
      claim.totalApprovedAmount = claim.totalClaimedAmount;
      claim.items.forEach((item: IClaimItem) => {
        item.approvedAmount = item.claimedAmount;
      });
    }

    return await claim.save();
  }

  public async getMemberClaims(
    memberId: string,
    hmoId: string
  ): Promise<IClaimDocument[]> {
    return await ClaimModel.find({
      memberId: new Types.ObjectId(memberId),
      hmoId: new Types.ObjectId(hmoId),
    })
      .populate('providerId', 'name code')
      .sort({ createdAt: -1 })
      .exec();
  }
}

export const claimsService = new ClaimsService();