import { Document, Types } from 'mongoose';

export enum ProviderType {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  TERTIARY = 'TERTIARY',
  DIAGNOSTIC = 'DIAGNOSTIC',
  PHARMACY = 'PHARMACY',
}

export enum ProviderStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
}

export interface IProviderContact {
  email: string;
  phone: string;
  contactPerson?: string;
}

export interface IProviderAddress {
  street: string;
  city: string;
  state: string;
  country: string;
}

export interface IProviderDocument extends Document {
  _id: Types.ObjectId;
  hmoId: Types.ObjectId;
  code: string;
  name: string;
  type: ProviderType;
  status: ProviderStatus;
  tier?: string;
  contact: IProviderContact;
  address: IProviderAddress;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProviderInput {
  code: string;
  name: string;
  type: ProviderType;
  tier?: string;
  contact: IProviderContact;
  address: IProviderAddress;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
}

export interface UpdateProviderInput extends Partial<CreateProviderInput> {
  status?: ProviderStatus;
}

export interface ProviderQueryFilters {
  page?: number;
  limit?: number;
  status?: ProviderStatus;
  type?: ProviderType;
  state?: string;
  search?: string;
}

export interface PaginatedProvidersResult {
  providers: IProviderDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}