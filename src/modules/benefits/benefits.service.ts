import { Types } from 'mongoose';
import { BenefitPackageModel } from './benefits.model.js';
import {
  BenefitPackageQueryFilters,
  CreateBenefitPackageInput,
  IBenefitPackageDocument,
  PaginatedBenefitPackagesResult,
  UpdateBenefitPackageInput,
} from './benefits.types.js';

export class BenefitsService {
  public async createPackage(
    hmoId: string,
    input: CreateBenefitPackageInput
  ): Promise<IBenefitPackageDocument> {
    const packageData = {
      ...input,
      hmoId: new Types.ObjectId(hmoId),
    };

    return await BenefitPackageModel.create(packageData);
  }

  public async getPackages(
    hmoId: string,
    filters: BenefitPackageQueryFilters
  ): Promise<PaginatedBenefitPackagesResult> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      hmoId: new Types.ObjectId(hmoId),
    };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.tier) {
      query.tier = filters.tier;
    }

    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [{ name: searchRegex }, { code: searchRegex }];
    }

    const [packages, total] = await Promise.all([
      BenefitPackageModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      BenefitPackageModel.countDocuments(query),
    ]);

    return {
      packages,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getPackageById(
    id: string,
    hmoId: string
  ): Promise<IBenefitPackageDocument | null> {
    return await BenefitPackageModel.findOne({
      _id: new Types.ObjectId(id),
      hmoId: new Types.ObjectId(hmoId),
    }).exec();
  }

  public async updatePackage(
    id: string,
    hmoId: string,
    input: UpdateBenefitPackageInput
  ): Promise<IBenefitPackageDocument | null> {
    return await BenefitPackageModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        hmoId: new Types.ObjectId(hmoId),
      },
      { $set: input },
      { new: true, runValidators: true }
    ).exec();
  }
}

export const benefitsService = new BenefitsService();