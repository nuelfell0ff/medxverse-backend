import { HMOProvider, HMOPreAuth, HMOClaim } from './hmo.model.js';
import {
  CreateHMOProviderDto,
  UpdateHMOProviderDto,
  CreatePreAuthDto,
  UpdatePreAuthStatusDto,
  CreateClaimDto,
  UpdateClaimStatusDto,
  HMOQueryFilters,
  IClaimItem,
} from './hmo.types.js';
import { ApiError } from '../../utils/ApiError.js';

export class HMOService {
  /**
   * Helper to generate unique claim numbers
   */
  private static generateClaimNumber(): string {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const random = Math.floor(100000 + Math.random() * 900000);
    return `CLM-${dateStr}-${random}`;
  }

  /**
   * Helper to generate unique pre-auth codes
   */
  private static generatePreAuthCode(): string {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const random = Math.floor(1000 + Math.random() * 9000);
    return `PA-${dateStr}-${random}`;
  }

  /**
   * Helper to generate HMO code from name
   */
  private static generateHMOCode(name: string): string {
    const prefix = name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
    const random = Math.floor(100 + Math.random() * 900);
    return `HMO-${prefix}${random}`;
  }

  // ==========================================
  // HMO PROVIDER MANAGEMENT
  // ==========================================

  static async createProvider(dto: CreateHMOProviderDto, organizationId: string) {
    const code = dto.code ? dto.code.toUpperCase() : this.generateHMOCode(dto.name);

    const existingProvider = await HMOProvider.findOne({ code });
    if (existingProvider) {
      throw new ApiError(409, `HMO Provider with code '${code}' already exists.`);
    }

    const provider = await HMOProvider.create({
      ...dto,
      code,
      organizationId,
    });

    return provider;
  }

  static async getProviders(organizationId: string, isActiveOnly = true) {
    const query: any = { organizationId };
    if (isActiveOnly) query.isActive = true;

    return HMOProvider.find(query).sort({ name: 1 });
  }

  static async getProviderById(id: string, organizationId: string) {
    const provider = await HMOProvider.findOne({ _id: id, organizationId });
    if (!provider) {
      throw new ApiError(404, 'HMO Provider not found.');
    }
    return provider;
  }

  static async updateProvider(id: string, dto: UpdateHMOProviderDto, organizationId: string) {
    const provider = await HMOProvider.findOneAndUpdate(
      { _id: id, organizationId },
      { $set: dto },
      { new: true, runValidators: true }
    );

    if (!provider) {
      throw new ApiError(404, 'HMO Provider not found.');
    }

    return provider;
  }

  // ==========================================
  // PRE-AUTHORIZATION WORKFLOW
  // ==========================================

  static async createPreAuth(dto: CreatePreAuthDto, userId: string, organizationId: string) {
    const provider = await HMOProvider.findOne({ _id: dto.hmoProviderId, organizationId });
    if (!provider) {
      throw new ApiError(404, 'Selected HMO Provider does not exist or is inactive.');
    }

    let totalEstimatedCost = 0;
    dto.requestedServices.forEach((service) => {
      totalEstimatedCost += service.estimatedCost;
    });

    const authCode = this.generatePreAuthCode();

    const preAuth = await HMOPreAuth.create({
      authCode,
      hmoProviderId: dto.hmoProviderId,
      patientId: dto.patientId,
      requestedBy: userId,
      organizationId,
      diagnosisCode: dto.diagnosisCode,
      diagnosisDescription: dto.diagnosisDescription,
      requestedServices: dto.requestedServices,
      totalEstimatedCost,
      status: 'PENDING',
      notes: dto.notes,
    });

    return preAuth.populate([
      { path: 'patientId', select: 'firstName lastName mrn insuranceNumber' },
      { path: 'hmoProviderId', select: 'name code' },
      { path: 'requestedBy', select: 'firstName lastName staffCode' },
    ]);
  }

  static async getPreAuths(organizationId: string, filters: HMOQueryFilters) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const query: any = { organizationId };

    if (filters.hmoProviderId) query.hmoProviderId = filters.hmoProviderId;
    if (filters.patientId) query.patientId = filters.patientId;
    if (filters.status) query.status = filters.status;

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const [preAuths, total] = await Promise.all([
      HMOPreAuth.find(query)
        .populate('patientId', 'firstName lastName mrn insuranceNumber')
        .populate('hmoProviderId', 'name code')
        .populate('requestedBy', 'firstName lastName staffCode')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      HMOPreAuth.countDocuments(query),
    ]);

    return {
      preAuths,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async updatePreAuthStatus(id: string, dto: UpdatePreAuthStatusDto, organizationId: string) {
    const preAuth = await HMOPreAuth.findOne({ _id: id, organizationId });
    if (!preAuth) {
      throw new ApiError(404, 'Pre-authorization record not found.');
    }

    preAuth.status = dto.status;

    if (dto.status === 'APPROVED') {
      preAuth.approvedAmount = dto.approvedAmount ?? preAuth.totalEstimatedCost;
      const validityDays = dto.validityDays || 30;
      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + validityDays);
      preAuth.validUntil = expireDate;
    } else if (dto.status === 'REJECTED') {
      preAuth.rejectionReason = dto.rejectionReason || 'Request rejected by HMO.';
    }

    await preAuth.save();

    return preAuth.populate([
      { path: 'patientId', select: 'firstName lastName mrn' },
      { path: 'hmoProviderId', select: 'name code' },
    ]);
  }

  // ==========================================
  // CLAIMS MANAGEMENT & ADJUDICATION
  // ==========================================

  static async createClaim(dto: CreateClaimDto, userId: string, organizationId: string) {
    const provider = await HMOProvider.findOne({ _id: dto.hmoProviderId, organizationId });
    if (!provider) {
      throw new ApiError(404, 'Specified HMO Provider is not recognized.');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new ApiError(400, 'Claim must contain at least one line item.');
    }

    let totalClaimAmount = 0;
    const claimItems: IClaimItem[] = dto.items.map((item) => {
      const totalPrice = item.quantity * item.unitPrice;
      totalClaimAmount += totalPrice;
      return {
        serviceName: item.serviceName,
        type: item.type,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice,
      };
    });

    const claimNumber = this.generateClaimNumber();

    const claim = await HMOClaim.create({
      claimNumber,
      hmoProviderId: dto.hmoProviderId,
      patientId: dto.patientId,
      policyNumber: dto.policyNumber,
      preAuthCode: dto.preAuthCode,
      opdVisitId: dto.opdVisitId,
      submittedBy: userId,
      organizationId,
      items: claimItems,
      totalClaimAmount,
      status: 'SUBMITTED',
      submissionDate: new Date(),
      remarks: dto.remarks,
    });

    return claim.populate([
      { path: 'patientId', select: 'firstName lastName mrn' },
      { path: 'hmoProviderId', select: 'name code' },
      { path: 'submittedBy', select: 'firstName lastName staffCode' },
    ]);
  }

  static async getClaims(organizationId: string, filters: HMOQueryFilters) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const query: any = { organizationId };

    if (filters.hmoProviderId) query.hmoProviderId = filters.hmoProviderId;
    if (filters.patientId) query.patientId = filters.patientId;
    if (filters.status) query.status = filters.status;

    if (filters.startDate || filters.endDate) {
      query.submissionDate = {};
      if (filters.startDate) query.submissionDate.$gte = new Date(filters.startDate);
      if (filters.endDate) query.submissionDate.$lte = new Date(filters.endDate);
    }

    const [claims, total] = await Promise.all([
      HMOClaim.find(query)
        .populate('patientId', 'firstName lastName mrn')
        .populate('hmoProviderId', 'name code')
        .populate('submittedBy', 'firstName lastName staffCode')
        .sort({ submissionDate: -1 })
        .skip(skip)
        .limit(limit),
      HMOClaim.countDocuments(query),
    ]);

    return {
      claims,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getClaimById(id: string, organizationId: string) {
    const claim = await HMOClaim.findOne({ _id: id, organizationId })
      .populate('patientId', 'firstName lastName mrn gender dateOfBirth')
      .populate('hmoProviderId', 'name code email phone')
      .populate('submittedBy', 'firstName lastName staffCode department');

    if (!claim) {
      throw new ApiError(404, 'Claim record not found.');
    }

    return claim;
  }

  static async updateClaimStatus(id: string, dto: UpdateClaimStatusDto, organizationId: string) {
    const claim = await HMOClaim.findOne({ _id: id, organizationId });
    if (!claim) {
      throw new ApiError(404, 'Claim record not found.');
    }

    claim.status = dto.status;
    claim.adjudicationDate = new Date();

    if (dto.status === 'APPROVED' || dto.status === 'DISBURSED') {
      claim.approvedAmount = dto.approvedAmount !== undefined ? dto.approvedAmount : claim.totalClaimAmount;
    } else if (dto.status === 'REJECTED') {
      claim.rejectionReason = dto.rejectionReason || 'Claim rejected upon verification.';
    }

    if (dto.remarks) {
      claim.remarks = dto.remarks;
    }

    await claim.save();

    return claim.populate([
      { path: 'patientId', select: 'firstName lastName mrn' },
      { path: 'hmoProviderId', select: 'name code' },
    ]);
  }
}