import { Document, Types } from 'mongoose';

export enum PreAuthStatus {
  NEW_REQUEST = 'NEW_REQUEST',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
}

export enum PreAuthPriority {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY',
}

export interface IProcedureItem {
  code: string;
  description: string;
  requestedAmount: number;
  approvedAmount?: number;
}

export interface IPreAuthHistoryEntry {
  status: PreAuthStatus;
  reason?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt: Date;
  totalApprovedAmount: number;
}

export interface IPreAuthorization {
  hmoId: Types.ObjectId;
  requestNumber: string;
  authorizationCode?: string;
  memberId: Types.ObjectId;
  providerId: Types.ObjectId;
  diagnosisCode: string;
  diagnosisDescription: string;
  priority: PreAuthPriority;
  status: PreAuthStatus;
  procedures: IProcedureItem[];
  totalRequestedAmount: number;
  totalApprovedAmount: number;
  clinicalNotes?: string;
  decisionReason?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  expiresAt?: Date;
  history: IPreAuthHistoryEntry[];
}

export interface IPreAuthDocument extends IPreAuthorization, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePreAuthInput {
  hmoId: string;
  memberId: string;
  providerId: string;
  diagnosisCode: string;
  diagnosisDescription: string;
  priority?: PreAuthPriority;
  procedures: IProcedureItem[];
  clinicalNotes?: string;
}

export interface ReviewPreAuthInput {
  status:
    | PreAuthStatus.APPROVED
    | PreAuthStatus.DECLINED
    | PreAuthStatus.PENDING
    | PreAuthStatus.CANCELLED;
  procedures?: {
    code: string;
    approvedAmount: number;
  }[];
  decisionReason?: string;
  expiresInDays?: number;
}

export interface GetPreAuthQuery {
  page?: number;
  limit?: number;
  status?: PreAuthStatus;
  priority?: PreAuthPriority;
  memberId?: string;
  providerId?: string;
  search?: string;
}

export interface IPreAuthProcedure {
  code: string;
  description: string;
  requestedAmount: number;
  approvedAmount: number;
}
