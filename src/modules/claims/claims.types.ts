import { Document, Types } from 'mongoose';

export type ClaimStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID'
  | 'CANCELLED';

export type ClaimItemCategory =
  | 'PROCEDURE'
  | 'DRUG'
  | 'LAB_TEST'
  | 'CONSULTATION'
  | 'ACCOMMODATION'
  | 'OTHER';

export type ClaimEventType =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID'
  | 'CANCELLED'
  | 'APPEAL_SUBMITTED'
  | 'ADJUSTED';

export interface IClaimItem {
  code?: string;
  description: string;
  category: ClaimItemCategory;
  quantity: number;
  unitPrice: number;
  claimedAmount: number;
  approvedAmount?: number;
}

export interface IClaimEvent {
  type: ClaimEventType;
  fromStatus?: ClaimStatus;
  toStatus?: ClaimStatus;
  actorId?: Types.ObjectId;
  reason?: string;
  notes?: string;
  createdAt: Date;
}

export interface IClaimAppeal {
  reason: string;
  submittedBy: Types.ObjectId;
  submittedAt: Date;
  status: 'PENDING' | 'UPHELD' | 'OVERTURNED';
  resolution?: string;
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
}

export interface IClaimAdjustment {
  amount: number;
  reason: string;
  adjustedBy: Types.ObjectId;
  adjustedAt: Date;
}

export interface IClaim {
  hmoId: Types.ObjectId;
  claimNumber: string;
  memberId: Types.ObjectId;
  providerId: Types.ObjectId;
  preAuthorizationId?: string;
  diagnosis: string;
  icdCode?: string;
  treatmentDate: Date;
  submissionDate: Date;
  items: IClaimItem[];
  totalClaimedAmount: number;
  totalApprovedAmount?: number;
  adjustedAmount?: number;
  payableAmount?: number;
  status: ClaimStatus;
  rejectionReason?: string;
  adjudicatedBy?: Types.ObjectId;
  adjudicatedAt?: Date;
  notes?: string;
  duplicateRisk?: boolean;
  duplicateOf?: Types.ObjectId;
  events: IClaimEvent[];
  appeals: IClaimAppeal[];
  adjustments: IClaimAdjustment[];
}

export interface IClaimDocument extends IClaim, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClaimInput {
  claimNumber: string;
  memberId: string;
  providerId: string;
  preAuthorizationId?: string;
  diagnosis: string;
  icdCode?: string;
  treatmentDate: Date | string;
  items: Array<{
    code?: string;
    description: string;
    category: ClaimItemCategory;
    quantity: number;
    unitPrice: number;
  }>;
  notes?: string;
}

export interface UpdateClaimStatusInput {
  status: ClaimStatus;
  rejectionReason?: string;
  approvedItems?: Array<{
    itemIndex: number;
    approvedAmount: number;
  }>;
  notes?: string;
}

export interface SubmitAppealInput {
  reason: string;
}

export interface ResolveAppealInput {
  status: 'UPHELD' | 'OVERTURNED';
  resolution: string;
}

export interface CreateAdjustmentInput {
  amount: number;
  reason: string;
}

export interface ClaimQueryFilters {
  page?: number;
  limit?: number;
  status?: ClaimStatus;
  memberId?: string;
  providerId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  search?: string;
}

export interface PaginatedClaimsResult {
  claims: IClaimDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
