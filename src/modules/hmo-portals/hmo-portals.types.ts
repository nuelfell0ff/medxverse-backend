import { Types } from 'mongoose';

export type PortalRole = 'MEMBER' | 'PROVIDER';
export type PortalNotificationType = 'GENERAL' | 'CLAIM' | 'PRE_AUTH' | 'BILLING' | 'ELIGIBILITY' | 'UTILIZATION' | 'SYSTEM';

export interface PortalUserContext {
  userId: string;
  hmoId: string;
  role?: string;
}

export interface MemberPortalProfileInput {
  memberId: string;
  preferredLanguage?: string;
  preferredContactChannel?: 'EMAIL' | 'SMS' | 'PHONE' | 'PUSH';
  marketingConsent?: boolean;
  healthDataConsent?: boolean;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
}

export interface ProviderPortalProfileInput {
  providerId: string;
  notificationEmail?: string;
  notificationPhone?: string;
  preferredContactChannel?: 'EMAIL' | 'SMS' | 'PHONE' | 'PUSH';
  claimsNotificationEnabled?: boolean;
  paymentNotificationEnabled?: boolean;
}

export interface MemberQueryFilters {
  page?: number | string;
  limit?: number | string;
  search?: string;
}

export interface ProviderMemberQueryFilters extends MemberQueryFilters {
  status?: string;
}

export interface CreateProviderAuthorizationInput {
  memberId: string;
  benefitId?: string;
  benefitCode?: string;
  serviceCode?: string;
  serviceName?: string;
  diagnosisCodes?: string[];
  requestedAmount?: number;
  requestedDate?: string | Date;
  clinicalNotes?: string;
  referralProviderId?: string;
}

export interface CreateProviderClaimInput {
  memberId: string;
  claimNumber?: string;
  preAuthorizationId?: string;
  diagnosis?: string;
  icdCode?: string;
  treatmentDate: string | Date;
  items: Array<{
    serviceCode?: string;
    serviceName: string;
    quantity?: number;
    unitAmount: number;
    claimedAmount?: number;
  }>;
  notes?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type ObjectIdLike = Types.ObjectId | string;
