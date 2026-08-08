import { Types } from 'mongoose';
import { ProviderModel } from './provider.model.js';
export class ProviderService {
    async createProvider(hmoId, input) {
        const providerData = {
            ...input,
            hmoId: new Types.ObjectId(hmoId),
        };
        return await ProviderModel.create(providerData);
    }
    async getProviders(hmoId, filters) {
        const page = Math.max(1, filters.page || 1);
        const limit = Math.max(1, Math.min(100, filters.limit || 20));
        const skip = (page - 1) * limit;
        const query = {
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
    async getProviderById(id, hmoId) {
        return await ProviderModel.findOne({
            _id: new Types.ObjectId(id),
            hmoId: new Types.ObjectId(hmoId),
        }).exec();
    }
    async updateProvider(id, hmoId, input) {
        return await ProviderModel.findOneAndUpdate({
            _id: new Types.ObjectId(id),
            hmoId: new Types.ObjectId(hmoId),
        }, { $set: input }, { new: true, runValidators: true }).exec();
    }
}
export const providerService = new ProviderService();
