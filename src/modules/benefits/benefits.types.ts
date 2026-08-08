import { Document, Types } from 'mongoose';

export enum BenefitCategory {
  OUTPATIENT = 'OUTPATIENT',
  INPATIENT = 'INPATIENT',
  MATERNITY = 'MATERNITY',
  DENTAL = 'DENTAL',
  OPTICAL = 'OPTICAL',
  SURGICAL = 'SURGICAL',
  EMERGENCY = 'EMERGENCY',
  PHARMACY = 'PHARMACY',
  PREVENTIVE = 'PREVENTIVE',
}

export enum PackageStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export interface IBenefitRule {
  category: BenefitCategory;
  isCovered: boolean;
  annualLimit?: number;
  perVisitLimit?: number;
  copayPercentage?: number;
  copayAmount?: number;
  requiresPreAuth: boolean;
  notes?: string;
}

export interface IBenefitPackageDocument extends Document {
  _id: Types.ObjectId;
  hmoId: Types.ObjectId;
  code: string;
  name: string;
  description?: string;
  tier?: string;
  annualMaxBenefit?: number;
  status: PackageStatus;
  rules: IBenefitRule[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBenefitPackageInput {
  code: string;
  name: string;
  description?: string;
  tier?: string;
  annualMaxBenefit?: number;
  rules: IBenefitRule[];
}

export interface UpdateBenefitPackageInput extends Partial<CreateBenefitPackageInput> {
  status?: PackageStatus;
}

export interface BenefitPackageQueryFilters {
  page?: number;
  limit?: number;
  status?: PackageStatus;
  tier?: string;
  search?: string;
}

export interface PaginatedBenefitPackagesResult {
  packages: IBenefitPackageDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}