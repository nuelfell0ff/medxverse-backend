import { Types } from 'mongoose';
import { ProviderModel } from './provider.model.js';
import {
  CreateProviderInput,
  IProviderDocument,
  PaginatedProvidersResult,
  ProviderQueryFilters,
  UpdateProviderInput,
} from './provider.types.js';

export class ProviderService {
  public async createProvider(
    hmoId: string,
    input: CreateProviderInput
  ): Promise<IProviderDocument> {
    const providerData = {
      ...input,
      hmoId: new Types.ObjectId(hmoId),
    };

    return await ProviderModel.create(providerData);
  }

  public async getProviders(
    hmoId: string,
    filters: ProviderQueryFilters
  ): Promise<PaginatedProvidersResult> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      hmoId: new Types.ObjectId(hmoId),
    };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.state) {
      query['address.state'] = new RegExp(filters.state, 'i');
    }

    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [{ name: searchRegex }, { code: searchRegex }];
    }

    const [providers, total] = await Promise.all([
      ProviderModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      ProviderModel.countDocuments(query),
    ]);

    return {
      providers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getProviderById(
    id: string,
    hmoId: string
  ): Promise<IProviderDocument | null> {
    return await ProviderModel.findOne({
      _id: new Types.ObjectId(id),
      hmoId: new Types.ObjectId(hmoId),
    }).exec();
  }

  public async updateProvider(
    id: string,
    hmoId: string,
    input: UpdateProviderInput
  ): Promise<IProviderDocument | null> {
    return await ProviderModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        hmoId: new Types.ObjectId(hmoId),
      },
      { $set: input },
      { new: true, runValidators: true }
    ).exec();
  }
}

export const providerService = new ProviderService();