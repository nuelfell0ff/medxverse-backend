import { Document, Types } from 'mongoose';

export enum ProviderType {
  HOSPITAL = 'HOSPITAL',
  CLINIC = 'CLINIC',
  PHARMACY = 'PHARMACY',
  LABORATORY = 'LABORATORY',
  SPECIALIST = 'SPECIALIST',
  DIAGNOSTIC_CENTER = 'DIAGNOSTIC_CENTER',
  OTHER = 'OTHER',
}

export enum ProviderStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
  ARCHIVED = 'ARCHIVED',
}

export enum AccreditationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  EXPIRED = 'EXPIRED',
  REJECTED = 'REJECTED',
}

export enum ProviderContractStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
}

export enum ProviderPaymentModel {
  FEE_FOR_SERVICE = 'FEE_FOR_SERVICE',
  CAPITATION = 'CAPITATION',
  HYBRID = 'HYBRID',
  OTHER = 'OTHER',
}

export interface IProviderAddress {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface IProviderContact {
  name?: string;
  phone?: string;
  email?: string;
}

export interface IProviderAccreditation {
  status: AccreditationStatus;
  number?: string;
  authority?: string;
  issuedAt?: Date;
  expiresAt?: Date;
  notes?: string;
}

export interface IProviderContract {
  contractNumber?: string;
  status: ProviderContractStatus;
  startDate?: Date;
  endDate?: Date;
  paymentModel: ProviderPaymentModel;
  networkIds: string[];
  notes?: string;
}

export interface IProviderPerformance {
  claimsCount: number;
  approvedClaims: number;
  rejectedClaims: number;
  totalBilled: number;
  totalApproved: number;
  averageProcessingDays?: number;
  utilizationCount: number;
  lastCalculatedAt?: Date;
}

export interface IProvider {
  _id: Types.ObjectId;
  hmoId: Types.ObjectId;
  code: string;
  name: string;
  type: ProviderType;
  status: ProviderStatus;
  licenseNumber?: string;
  taxId?: string;
  specialty?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: IProviderAddress;
  primaryContact?: IProviderContact;
  services: string[];
  accreditation: IProviderAccreditation;
  contract: IProviderContract;
  networkIds: string[];
  tariffIds: Types.ObjectId[];
  performance: IProviderPerformance;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProviderDocument extends IProvider, Document {}

export interface CreateProviderInput {
  code: string;
  name: string;
  type: ProviderType;
  status?: ProviderStatus;
  licenseNumber?: string;
  taxId?: string;
  specialty?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: IProviderAddress;
  primaryContact?: IProviderContact;
  services?: string[];
  accreditation?: Partial<IProviderAccreditation>;
  contract?: Partial<IProviderContract>;
  networkIds?: string[];
  tariffIds?: string[];
  notes?: string;
}

export interface UpdateProviderInput {
  code?: string;
  name?: string;
  type?: ProviderType;
  licenseNumber?: string;
  taxId?: string;
  specialty?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: IProviderAddress;
  primaryContact?: IProviderContact;
  services?: string[];
  accreditation?: Partial<IProviderAccreditation>;
  contract?: Partial<IProviderContract>;
  networkIds?: string[];
  tariffIds?: string[];
  notes?: string;
}

export interface ProviderQueryFilters {
  page?: number | string;
  limit?: number | string;
  search?: string;
  type?: ProviderType;
  status?: ProviderStatus;
  accreditationStatus?: AccreditationStatus;
  network?: string;
}

export interface PaginatedProvidersResult {
  providers: IProviderDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProviderStats {
  total: number;
  pending: number;
  active: number;
  inactive: number;
  suspended: number;
  expired: number;
  archived: number;
  accredited: number;
  expiringAccreditations: number;
}

export interface UpdateProviderStatusInput {
  status: ProviderStatus;
  reason?: string;
}

export interface UpdateProviderAccreditationInput {
  status: AccreditationStatus;
  number?: string;
  authority?: string;
  issuedAt?: Date | string;
  expiresAt?: Date | string;
  notes?: string;
}
