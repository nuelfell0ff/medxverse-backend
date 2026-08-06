import { HmoClaimModel, HmoPreAuthModel } from './hmo.model.js';
import { CreateClaimDto, PreAuthDto } from './hmo.types.js';

export class HmoService {
  public static async verifyEligibility(hospitalId: string, policyNumber: string, hmoId: string) {
    return {
      eligible: true,
      policyNumber,
      hmoId,
      coverageDetails: { capitation: true, limit: 500000, coPayPercentage: 10 },
    };
  }

  public static async requestPreAuthorization(hospitalId: string, data: PreAuthDto) {
    const preAuth = await HmoPreAuthModel.create({
      hospitalId,
      ...data,
      status: 'PENDING',
    });
    return preAuth;
  }

  public static async submitClaim(hospitalId: string, data: CreateClaimDto) {
    const claim = await HmoClaimModel.create({
      hospitalId,
      ...data,
      status: 'PENDING',
    });
    return claim;
  }

  public static async getClaims(
    hospitalId: string,
    filters: { status?: string; patientId?: string; page?: number; limit?: number }
  ) {
    const query: any = { hospitalId };
    if (filters.status) query.status = filters.status;
    if (filters.patientId) query.patientId = filters.patientId;

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const [claims, total] = await Promise.all([
      HmoClaimModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
      HmoClaimModel.countDocuments(query),
    ]);

    return { claims, total, page, limit, pages: Math.ceil(total / limit) };
  }

  public static async getClaimById(id: string, hospitalId: string) {
    const claim = await HmoClaimModel.findOne({ _id: id, hospitalId });
    if (!claim) throw new Error('Claim not found');
    return claim;
  }
}