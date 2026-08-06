import { Document, Types } from 'mongoose';

export type ClaimStatus = 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'DISBURSED';
export type PreAuthStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
export type ClaimItemType = 'CONSULTATION' | 'LAB_TEST' | 'MEDICATION' | 'PROCEDURE' | 'ACCOMMODATION' | 'OTHER';

export interface IHMOProvider {
  name: string;
  code: string;
  email: string;
  phone: string;
  address?: string;
  contactPerson?: {
    name: string;
    phone: string;
    email: string;
  };
  portalUrl?: string;
  organizationId: Types.ObjectId;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IHMOProviderDocument extends IHMOProvider, Document {
  _id: Types.ObjectId;
}

export interface CreateHMOProviderDto {
  name: string;
  code?: string;
  email: string;
  phone: string;
  address?: string;
  contactPerson?: {
    name: string;
    phone: string;
    email: string;
  };
  portalUrl?: string;
}

export interface UpdateHMOProviderDto {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: {
    name: string;
    phone: string;
    email: string;
  };
  portalUrl?: string;
  isActive?: boolean;
}

export interface IHMOPreAuth {
  authCode: string;
  hmoProviderId: Types.ObjectId;
  patientId: Types.ObjectId;
  requestedBy: Types.ObjectId;
  organizationId: Types.ObjectId;
  diagnosisCode?: string;
  diagnosisDescription: string;
  requestedServices: {
    serviceName: string;
    type: ClaimItemType;
    estimatedCost: number;
  }[];
  totalEstimatedCost: number;
  approvedAmount?: number;
  status: PreAuthStatus;
  rejectionReason?: string;
  validUntil?: Date;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IHMOPreAuthDocument extends IHMOPreAuth, Document {
  _id: Types.ObjectId;
}

export interface CreatePreAuthDto {
  hmoProviderId: string;
  patientId: string;
  diagnosisCode?: string;
  diagnosisDescription: string;
  requestedServices: {
    serviceName: string;
    type: ClaimItemType;
    estimatedCost: number;
  }[];
  notes?: string;
}

export interface UpdatePreAuthStatusDto {
  status: PreAuthStatus;
  approvedAmount?: number;
  rejectionReason?: string;
  validityDays?: number;
}

export interface IClaimItem {
  serviceName: string;
  type: ClaimItemType;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  approvedPrice?: number;
}

export interface IHMOClaim {
  claimNumber: string;
  hmoProviderId: Types.ObjectId;
  patientId: Types.ObjectId;
  policyNumber: string;
  preAuthCode?: string;
  opdVisitId?: Types.ObjectId;
  submittedBy: Types.ObjectId;
  organizationId: Types.ObjectId;
  items: IClaimItem[];
  totalClaimAmount: number;
  approvedAmount?: number;
  status: ClaimStatus;
  submissionDate: Date;
  adjudicationDate?: Date;
  rejectionReason?: string;
  remarks?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IHMOClaimDocument extends IHMOClaim, Document {
  _id: Types.ObjectId;
}

export interface CreateClaimDto {
  hmoProviderId: string;
  patientId: string;
  policyNumber: string;
  preAuthCode?: string;
  opdVisitId?: string;
  items: {
    serviceName: string;
    type: ClaimItemType;
    quantity: number;
    unitPrice: number;
  }[];
  remarks?: string;
}

export interface UpdateClaimStatusDto {
  status: ClaimStatus;
  approvedAmount?: number;
  rejectionReason?: string;
  remarks?: string;
}

export interface HMOQueryFilters {
  hmoProviderId?: string;
  patientId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}