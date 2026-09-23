import { Types } from 'mongoose';
import { HMOProviderModel } from './provider.model.js';
import {
  AccreditationStatus,
  CreateProviderInput,
  IProviderAccreditation,
  IProviderContract,
  IProviderDocument,
  ProviderQueryFilters,
  ProviderStats,
  ProviderStatus,
  ProviderContractStatus,
  ProviderPaymentModel,
  UpdateProviderAccreditationInput,
  UpdateProviderInput,
  UpdateProviderStatusInput,
} from './provider.types.js';

type ServiceError = Error & { statusCode: number };
const error = (message: string, statusCode = 400): ServiceError => Object.assign(new Error(message), { statusCode });

const objectId = (value: string, field: string): Types.ObjectId => {
  if (!value || !Types.ObjectId.isValid(value)) throw error(`Invalid ${field}`);
  return new Types.ObjectId(value);
};

const clean = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const result = value.trim();
  return result || undefined;
};

const cleanList = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  return [...new Set(value.map(clean).filter((item): item is string => Boolean(item)))];
};

const date = (value: unknown, field: string): Date => {
  const result = new Date(String(value));
  if (Number.isNaN(result.getTime())) throw error(`Invalid ${field}`);
  return result;
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normaliseAccreditation = (input?: Partial<IProviderAccreditation>, fallback?: IProviderAccreditation): IProviderAccreditation => {
  const result: IProviderAccreditation = {
    status: input?.status ?? fallback?.status ?? AccreditationStatus.PENDING,
    number: clean(input?.number ?? fallback?.number),
    authority: clean(input?.authority ?? fallback?.authority),
    issuedAt: input?.issuedAt !== undefined ? date(input.issuedAt, 'accreditation issuedAt') : fallback?.issuedAt,
    expiresAt: input?.expiresAt !== undefined ? date(input.expiresAt, 'accreditation expiresAt') : fallback?.expiresAt,
    notes: clean(input?.notes ?? fallback?.notes),
  };
  if (result.issuedAt && result.expiresAt && result.expiresAt < result.issuedAt) throw error('Accreditation expiry cannot be before issue date');
  return result;
};

const normaliseContract = (input?: Partial<IProviderContract>, fallback?: IProviderContract): IProviderContract => ({
  contractNumber: clean(input?.contractNumber ?? fallback?.contractNumber),
  status: input?.status ?? fallback?.status ?? ProviderContractStatus.DRAFT,
  startDate: input?.startDate !== undefined ? date(input.startDate, 'contract startDate') : fallback?.startDate,
  endDate: input?.endDate !== undefined ? date(input.endDate, 'contract endDate') : fallback?.endDate,
  paymentModel: input?.paymentModel ?? fallback?.paymentModel ?? ProviderPaymentModel.FEE_FOR_SERVICE,
  networkIds: cleanList(input?.networkIds ?? fallback?.networkIds) ?? [],
  notes: clean(input?.notes ?? fallback?.notes),
});

const parsePage = (value: unknown, fallback: number, max: number): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(1, Math.trunc(n)));
};

export class HMOProviderService {
  public async createProvider(hmoId: string, input: CreateProviderInput): Promise<IProviderDocument> {
    const tenantId = objectId(hmoId, 'hmoId');
    const code = clean(input.code)?.toUpperCase();
    const name = clean(input.name);
    if (!code) throw error('Provider code is required');
    if (!name) throw error('Provider name is required');

    const duplicate = await HMOProviderModel.exists({ hmoId: tenantId, code });
    if (duplicate) throw error(`Provider code ${code} already exists`, 409);

    const accreditation = normaliseAccreditation(input.accreditation);
    const contract = normaliseContract(input.contract);
    if (contract.startDate && contract.endDate && contract.endDate < contract.startDate) throw error('Contract end date cannot be before start date');

    return HMOProviderModel.create({
      hmoId: tenantId,
      code,
      name,
      type: input.type,
      status: input.status ?? ProviderStatus.PENDING,
      licenseNumber: clean(input.licenseNumber)?.toUpperCase(),
      taxId: clean(input.taxId)?.toUpperCase(),
      specialty: clean(input.specialty),
      phone: clean(input.phone),
      email: clean(input.email)?.toLowerCase(),
      website: clean(input.website),
      address: input.address,
      primaryContact: input.primaryContact,
      services: cleanList(input.services) ?? [],
      accreditation,
      contract,
      networkIds: cleanList(input.networkIds) ?? [],
      tariffIds: (input.tariffIds ?? []).filter(Types.ObjectId.isValid).map((id) => new Types.ObjectId(id)),
      performance: { claimsCount: 0, approvedClaims: 0, rejectedClaims: 0, totalBilled: 0, totalApproved: 0, utilizationCount: 0 },
      notes: clean(input.notes),
    });
  }

  public async getProviders(hmoId: string, filters: ProviderQueryFilters) {
    const tenantId = objectId(hmoId, 'hmoId');
    const page = parsePage(filters.page, 1, 100000);
    const limit = parsePage(filters.limit, 20, 100);
    const query: Record<string, unknown> = { hmoId: tenantId };
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.accreditationStatus) query['accreditation.status'] = filters.accreditationStatus;
    if (filters.network) query.networkIds = filters.network;
    const search = clean(filters.search);
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      query.$or = [{ code: regex }, { name: regex }, { licenseNumber: regex }, { specialty: regex }, { email: regex }, { phone: regex }];
    }
    const [providers, total] = await Promise.all([
      HMOProviderModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      HMOProviderModel.countDocuments(query),
    ]);
    return { providers, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  public async getProviderById(id: string, hmoId: string) {
    return HMOProviderModel.findOne({ _id: objectId(id, 'provider id'), hmoId: objectId(hmoId, 'hmoId') }).lean();
  }

  public async updateProvider(id: string, hmoId: string, input: UpdateProviderInput) {
    const _id = objectId(id, 'provider id');
    const tenantId = objectId(hmoId, 'hmoId');
    const provider = await HMOProviderModel.findOne({ _id, hmoId: tenantId });
    if (!provider) return null;
    if (input.code !== undefined) {
      const code = clean(input.code)?.toUpperCase();
      if (!code) throw error('Provider code cannot be empty');
      const duplicate = await HMOProviderModel.exists({ hmoId: tenantId, code, _id: { $ne: _id } });
      if (duplicate) throw error(`Provider code ${code} already exists`, 409);
      provider.code = code;
    }
    if (input.name !== undefined) provider.name = clean(input.name) ?? (() => { throw error('Provider name cannot be empty'); })();
    if (input.type !== undefined) provider.type = input.type;
    if (input.licenseNumber !== undefined) provider.licenseNumber = clean(input.licenseNumber)?.toUpperCase();
    if (input.taxId !== undefined) provider.taxId = clean(input.taxId)?.toUpperCase();
    if (input.specialty !== undefined) provider.specialty = clean(input.specialty);
    if (input.phone !== undefined) provider.phone = clean(input.phone);
    if (input.email !== undefined) provider.email = clean(input.email)?.toLowerCase();
    if (input.website !== undefined) provider.website = clean(input.website);
    if (input.address !== undefined) provider.address = input.address;
    if (input.primaryContact !== undefined) provider.primaryContact = input.primaryContact;
    if (input.services !== undefined) provider.services = cleanList(input.services) ?? [];
    if (input.networkIds !== undefined) provider.networkIds = cleanList(input.networkIds) ?? [];
    if (input.tariffIds !== undefined) provider.tariffIds = input.tariffIds.filter(Types.ObjectId.isValid).map((item) => new Types.ObjectId(item));
    if (input.accreditation !== undefined) provider.accreditation = normaliseAccreditation(input.accreditation, provider.accreditation);
    if (input.contract !== undefined) provider.contract = normaliseContract(input.contract, provider.contract);
    if (provider.contract.startDate && provider.contract.endDate && provider.contract.endDate < provider.contract.startDate) throw error('Contract end date cannot be before start date');
    if (input.notes !== undefined) provider.notes = clean(input.notes);
    return provider.save();
  }

  public async updateProviderStatus(id: string, hmoId: string, input: UpdateProviderStatusInput) {
    const provider = await HMOProviderModel.findOne({ _id: objectId(id, 'provider id'), hmoId: objectId(hmoId, 'hmoId') });
    if (!provider) return null;
    provider.status = input.status;
    if (input.reason) provider.notes = provider.notes ? `${provider.notes}\nStatus: ${input.reason}` : `Status: ${input.reason}`;
    return provider.save();
  }

  public async updateAccreditation(id: string, hmoId: string, input: UpdateProviderAccreditationInput) {
    const provider = await HMOProviderModel.findOne({ _id: objectId(id, 'provider id'), hmoId: objectId(hmoId, 'hmoId') });
    if (!provider) return null;
    provider.accreditation = normaliseAccreditation({ ...input, issuedAt: input.issuedAt !== undefined ? date(input.issuedAt, 'accreditation issuedAt') : undefined, expiresAt: input.expiresAt !== undefined ? date(input.expiresAt, 'accreditation expiresAt') : undefined }, provider.accreditation);
    return provider.save();
  }

  public async getStats(hmoId: string): Promise<ProviderStats> {
    const tenantId = objectId(hmoId, 'hmoId');
    const now = new Date();
    const soon = new Date(now);
    soon.setDate(soon.getDate() + 60);
    const [counts, accredited, expiring] = await Promise.all([
      HMOProviderModel.aggregate([{ $match: { hmoId: tenantId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      HMOProviderModel.countDocuments({ hmoId: tenantId, 'accreditation.status': AccreditationStatus.VERIFIED }),
      HMOProviderModel.countDocuments({ hmoId: tenantId, 'accreditation.status': AccreditationStatus.VERIFIED, 'accreditation.expiresAt': { $gte: now, $lte: soon } }),
    ]);
    const stats: ProviderStats = { total: 0, pending: 0, active: 0, inactive: 0, suspended: 0, expired: 0, archived: 0, accredited, expiringAccreditations: expiring };
    for (const row of counts) {
      const key = String(row._id).toLowerCase() as keyof ProviderStats;
      if (key in stats && typeof stats[key] === 'number') (stats[key] as number) = Number(row.count);
      stats.total += Number(row.count);
    }
    return stats;
  }

  public async getPerformance(id: string, hmoId: string) {
    const provider = await HMOProviderModel.findOne({ _id: objectId(id, 'provider id'), hmoId: objectId(hmoId, 'hmoId') }, { performance: 1, code: 1, name: 1, type: 1 }).lean();
    return provider;
  }
}

export const hmoProviderService = new HMOProviderService();
