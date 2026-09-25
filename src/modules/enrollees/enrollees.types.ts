import { Document, Types } from 'mongoose';

export type EnrolleeGender = 'MALE' | 'FEMALE' | 'OTHER';
export type EnrolleeMaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
export type EnrolleeStatus = 'ACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'PENDING';
export type EnrolleeRelationship = 'PRIMARY' | 'SPOUSE' | 'CHILD' | 'DEPENDENT';

export interface IEnrolleeAddress {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
}

/**
 * The registry intentionally uses the existing HMSMember persistence model.
 * Claims and pre-authorizations already reference these records by memberId,
 * so the registry must not create a second, disconnected member collection.
 */
export interface IEnrollee {
  hmoId: Types.ObjectId;
  policyNumber: string;
  firstName: string;
  lastName: string;
  otherNames?: string;
  email: string;
  phone: string;
  gender: EnrolleeGender;
  dateOfBirth: Date;
  maritalStatus?: EnrolleeMaritalStatus;
  address?: IEnrolleeAddress;
  healthPlanId: Types.ObjectId;
  primaryProviderId?: Types.ObjectId;
  relationship: EnrolleeRelationship;
  primaryMemberId?: Types.ObjectId;
  status: EnrolleeStatus;
  startDate: Date;
  endDate?: Date;
  photoUrl?: string;
}

export interface IEnrolleeDocument extends IEnrollee, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEnrolleeInput {
  policyNumber: string;
  firstName: string;
  lastName: string;
  otherNames?: string;
  email: string;
  phone: string;
  gender: EnrolleeGender;
  dateOfBirth: Date | string;
  maritalStatus?: EnrolleeMaritalStatus;
  address?: IEnrolleeAddress;
  healthPlanId?: string;
  primaryProviderId?: string;
  relationship?: EnrolleeRelationship;
  primaryMemberId?: string;
  status?: EnrolleeStatus;
  startDate?: Date | string;
  endDate?: Date | string;
  photoUrl?: string;
}

export interface UpdateEnrolleeInput {
  firstName?: string;
  lastName?: string;
  otherNames?: string;
  email?: string;
  phone?: string;
  gender?: EnrolleeGender;
  dateOfBirth?: Date | string;
  maritalStatus?: EnrolleeMaritalStatus;
  address?: IEnrolleeAddress;
  healthPlanId?: string;
  primaryProviderId?: string | null;
  relationship?: EnrolleeRelationship;
  primaryMemberId?: string | null;
  status?: EnrolleeStatus;
  startDate?: Date | string;
  endDate?: Date | string | null;
  photoUrl?: string | null;
}

export interface EnrolleeQueryFilters {
  page?: number;
  limit?: number;
  status?: EnrolleeStatus;
  healthPlanId?: string;
  relationship?: EnrolleeRelationship;
  search?: string;
}

export interface PaginatedEnrolleesResult {
  enrollees: IEnrolleeDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface EnrolleeStats {
  total: number;
  active: number;
  pending: number;
  suspended: number;
  terminated: number;
  primaryMembers: number;
  dependents: number;
  expiringSoon: number;
}

export interface EnrolleeEligibilityResult {
  eligible: boolean;
  status: EnrolleeStatus;
  policyNumber: string;
  enrolleeId: string;
  healthPlanId: string;
  coverageStartDate: Date;
  coverageEndDate?: Date;
  reason?: string;
}

export interface UpdateEnrolleeStatusInput {
  status: EnrolleeStatus;
  reason?: string;
}

export interface RenewEnrolleeInput {
  endDate: Date | string;
  reason?: string;
}

export interface EnrolleeCardResult {
  cardNumber: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  enrolleeId: string;
  policyNumber: string;
  issuedAt: Date;
  expiresAt?: Date;
}

export interface EnrolleeLifecycleResult {
  _id: string;
  type: string;
  fromStatus?: string;
  toStatus?: string;
  reason?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
