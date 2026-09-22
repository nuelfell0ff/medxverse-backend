import { Types } from 'mongoose';

export enum TariffStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum TariffCategory {
  CONSULTATION = 'CONSULTATION',
  LABORATORY = 'LABORATORY',
  RADIOLOGY = 'RADIOLOGY',
  PHARMACY = 'PHARMACY',
  PROCEDURE = 'PROCEDURE',
  SURGERY = 'SURGERY',
  INPATIENT = 'INPATIENT',
  OUTPATIENT = 'OUTPATIENT',
  EMERGENCY = 'EMERGENCY',
  MATERNITY = 'MATERNITY',
  DENTAL = 'DENTAL',
  OPTICAL = 'OPTICAL',
  OTHER = 'OTHER',
}

export interface ITariffProviderRate {
  providerId: Types.ObjectId;
  amount: number;
  notes?: string;
}

export interface ITariffDocument {
  _id: Types.ObjectId;
  hmoId: Types.ObjectId;
  code: string;
  name: string;
  description?: string;
  category: TariffCategory;
  status: TariffStatus;
  baseAmount: number;
  currency: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  unit?: string;
  providerRates: ITariffProviderRate[];
  requiresPreAuth: boolean;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateTariffInput {
  hmoId: string;
  code: string;
  name: string;
  description?: string;
  category: TariffCategory;
  baseAmount: number;
  currency?: string;
  effectiveFrom: string | Date;
  effectiveTo?: string | Date;
  unit?: string;
  providerRates?: Array<{
    providerId: string;
    amount: number;
    notes?: string;
  }>;
  requiresPreAuth?: boolean;
  notes?: string;
}

export interface UpdateTariffInput {
  code?: string;
  name?: string;
  description?: string;
  category?: TariffCategory;
  baseAmount?: number;
  currency?: string;
  effectiveFrom?: string | Date;
  effectiveTo?: string | Date;
  unit?: string;
  providerRates?: Array<{
    providerId: string;
    amount: number;
    notes?: string;
  }>;
  requiresPreAuth?: boolean;
  notes?: string;
}

export interface TariffQueryFilters {
  page?: number | string;
  limit?: number | string;
  search?: string;
  status?: TariffStatus;
  category?: TariffCategory;
  effectiveDate?: string;
  providerId?: string;
}

export interface PaginatedTariffsResult {
  tariffs: ITariffDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TariffQuoteInput {
  tariffId: string;
  providerId?: string;
  quantity?: number;
  date?: string;
}

export interface TariffQuoteResult {
  tariffId: Types.ObjectId;
  code: string;
  name: string;
  unitAmount: number;
  quantity: number;
  totalAmount: number;
  currency: string;
  requiresPreAuth: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
}
