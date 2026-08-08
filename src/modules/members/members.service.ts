import mongoose, { Types } from 'mongoose';
import { MemberModel } from './members.model.js';
import {
  CreateMemberInput,
  IMemberDocument,
  MemberQueryFilters,
  MemberStatus,
  PaginatedMembersResult,
  UpdateMemberInput,
} from './members.types.js';

export class MembersService {
  public async createMember(
    hmoId: string,
    input: CreateMemberInput
  ): Promise<IMemberDocument> {
    const memberData = {
      ...input,
      hmoId: new Types.ObjectId(hmoId),
      benefitPlanId: new Types.ObjectId(input.benefitPlanId),
      primaryProviderId: input.primaryProviderId
        ? new Types.ObjectId(input.primaryProviderId)
        : undefined,
      primaryMemberId: input.primaryMemberId
        ? new Types.ObjectId(input.primaryMemberId)
        : undefined,
    };

    return await MemberModel.create(memberData);
  }

  public async getMembers(
    hmoId: string,
    filters: MemberQueryFilters
  ): Promise<PaginatedMembersResult> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      hmoId: new Types.ObjectId(hmoId),
    };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.benefitPlanId) {
      query.benefitPlanId = new Types.ObjectId(filters.benefitPlanId);
    }

    if (filters.relationship) {
      query.relationship = filters.relationship;
    }

    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { policyNumber: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    const [members, total] = await Promise.all([
      MemberModel.find(query)
        .populate('benefitPlanId', 'name code category')
        .populate('primaryProviderId', 'name code state')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      MemberModel.countDocuments(query),
    ]);

    return {
      members,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getMemberById(id: string, hmoId: string): Promise<IMemberDocument | null> {
    return await MemberModel.findOne({
      _id: new Types.ObjectId(id),
      hmoId: new Types.ObjectId(hmoId),
    })
      .populate('benefitPlanId')
      .populate('primaryProviderId')
      .populate('primaryMemberId', 'firstName lastName policyNumber email')
      .exec();
  }

  public async updateMember(
    id: string,
    hmoId: string,
    input: UpdateMemberInput
  ): Promise<IMemberDocument | null> {
    const updateData: Record<string, unknown> = { ...input };

    if (input.benefitPlanId) {
      updateData.benefitPlanId = new Types.ObjectId(input.benefitPlanId);
    }
    if (input.primaryProviderId) {
      updateData.primaryProviderId = new Types.ObjectId(input.primaryProviderId);
    }
    if (input.primaryMemberId) {
      updateData.primaryMemberId = new Types.ObjectId(input.primaryMemberId);
    }

    return await MemberModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        hmoId: new Types.ObjectId(hmoId),
      },
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('benefitPlanId')
      .populate('primaryProviderId')
      .exec();
  }

  public async updateMemberStatus(
    id: string,
    hmoId: string,
    status: MemberStatus
  ): Promise<IMemberDocument | null> {
    return await MemberModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        hmoId: new Types.ObjectId(hmoId),
      },
      { $set: { status } },
      { new: true }
    ).exec();
  }

  public async getDependents(
    primaryMemberId: string,
    hmoId: string
  ): Promise<IMemberDocument[]> {
    return await MemberModel.find({
      primaryMemberId: new Types.ObjectId(primaryMemberId),
      hmoId: new Types.ObjectId(hmoId),
    })
      .populate('benefitPlanId', 'name code')
      .exec();
  }
}

export const membersService = new MembersService();