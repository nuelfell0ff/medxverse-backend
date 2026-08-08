import { Document, Types } from 'mongoose';

export type ClaimStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID'
  | 'CANCELLED';

export type ClaimItemCategory = 'PROCEDURE' | 'DRUG' | 'LAB_TEST' | 'CONSULTATION' | 'ACCOMMODATION' | 'OTHER';

export interface IClaimItem {
  code?: string;
  description: string;
  category: ClaimItemCategory;
  quantity: number;
  unitPrice: number;
  claimedAmount: number;
  approvedAmount?: number;
}

export interface IClaim {
  hmoId: Types.ObjectId;
  claimNumber: string;
  memberId: Types.ObjectId;
  providerId: Types.ObjectId;
  diagnosis: string;
  icdCode?: string;
  treatmentDate: Date;
  submissionDate: Date;
  items: IClaimItem[];
  totalClaimedAmount: number;
  totalApprovedAmount?: number;
  status: ClaimStatus;
  rejectionReason?: string;
  adjudicatedBy?: Types.ObjectId;
  adjudicatedAt?: Date;
  notes?: string;
}

export interface IClaimDocument extends IClaim, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClaimInput {
  claimNumber: string;
  memberId: string;
  providerId: string;
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