import { Document, Types } from 'mongoose';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
export type MemberStatus = 'ACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'PENDING';
export type RelationshipType = 'PRIMARY' | 'SPOUSE' | 'CHILD' | 'DEPENDENT';

export interface IMemberAddress {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
}

/**
 * A Member is the same persisted HMSMember identity used by the Enrollee
 * Registry. The Member API is a compatibility-facing name for consumers that
 * still call this resource "member".
 */
export interface IMember {
  hmoId: Types.ObjectId;
  policyNumber: string;
  firstName: string;
  lastName: string;
  otherNames?: string;
  email: string;
  phone: string;
  gender: Gender;
  dateOfBirth: Date;
  maritalStatus?: MaritalStatus;
  address?: IMemberAddress;
  healthPlanId: Types.ObjectId;
  primaryProviderId?: Types.ObjectId;
  relationship: RelationshipType;
  primaryMemberId?: Types.ObjectId;
  status: MemberStatus;
  startDate: Date;
  endDate?: Date;
  photoUrl?: string;
}

export interface IMemberDocument extends IMember, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMemberInput {
  policyNumber: string;
  firstName: string;
  lastName: string;
  otherNames?: string;
  email: string;
  phone: string;
  gender: Gender;
  dateOfBirth: Date | string;
  maritalStatus?: MaritalStatus;
  address?: IMemberAddress;
  healthPlanId?: string;
  primaryProviderId?: string;
  relationship?: RelationshipType;
  primaryMemberId?: string;
  status?: MemberStatus;
  startDate?: Date | string;
  endDate?: Date | string;
  photoUrl?: string;
}

export interface UpdateMemberInput {
  firstName?: string;
  lastName?: string;
  otherNames?: string;
  email?: string;
  phone?: string;
  gender?: Gender;
  dateOfBirth?: Date | string;
  maritalStatus?: MaritalStatus;
  address?: IMemberAddress;
  healthPlanId?: string;
  primaryProviderId?: string | null;
  relationship?: RelationshipType;
  primaryMemberId?: string | null;
  status?: MemberStatus;
  startDate?: Date | string;
  endDate?: Date | string | null;
  photoUrl?: string | null;
}

export interface MemberQueryFilters {
  page?: number;
  limit?: number;
  status?: MemberStatus;
  healthPlanId?: string;
  relationship?: RelationshipType;
  search?: string;
}

export interface PaginatedMembersResult {
  members: IMemberDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
