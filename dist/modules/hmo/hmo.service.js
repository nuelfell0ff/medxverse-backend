import { HmoClaimModel, HmoPreAuthModel } from './hmo.model.js';
export class HmoService {
    static async verifyEligibility(hospitalId, policyNumber, hmoId) {
        return {
            eligible: true,
            policyNumber,
            hmoId,
            coverageDetails: { capitation: true, limit: 500000, coPayPercentage: 10 },
        };
    }
    static async requestPreAuthorization(hospitalId, data) {
        const preAuth = await HmoPreAuthModel.create({
            hospitalId,
            ...data,
            status: 'PENDING',
        });
        return preAuth;
    }
    static async submitClaim(hospitalId, data) {
        const claim = await HmoClaimModel.create({
            hospitalId,
            ...data,
            status: 'PENDING',
        });
        return claim;
    }
    static async getClaims(hospitalId, filters) {
        const query = { hospitalId };
        if (filters.status)
            query.status = filters.status;
        if (filters.patientId)
            query.patientId = filters.patientId;
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;
        const [claims, total] = await Promise.all([
            HmoClaimModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
            HmoClaimModel.countDocuments(query),
        ]);
        return { claims, total, page, limit, pages: Math.ceil(total / limit) };
    }
    static async getClaimById(id, hospitalId) {
        const claim = await HmoClaimModel.findOne({ _id: id, hospitalId });
        if (!claim)
            throw new Error('Claim not found');
        return claim;
    }
}
