import { Document, Types } from 'mongoose';

export type ClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISPUTED';
export type PreAuthStatus = 'PENDING' | 'APPROVED' | 'DENIED';

export interface IClaimItem {
  description: string;
  code: string;
  cost: number;
}

export interface IHmoClaim extends Document {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  hmoProviderId: Types.ObjectId;
  policyNumber: string;
  claimAmount: number;
  approvedAmount?: number;
  diagnosisCode: string;
  items: IClaimItem[];
  status: ClaimStatus;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IHmoPreAuth extends Document {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  hmoProviderId: Types.ObjectId;
  procedureCode: string;
  estimatedCost: number;
  clinicalNotes: string;
  status: PreAuthStatus;
  authCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClaimDto {
  patientId: string;
  hmoProviderId: string;
  policyNumber: string;
  claimAmount: number;
  diagnosisCode: string;
  items: IClaimItem[];
}

export interface PreAuthDto {
  patientId: string;
  hmoProviderId: string;
  procedureCode: string;
  estimatedCost: number;
  clinicalNotes: string;
}