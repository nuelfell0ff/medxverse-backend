import { Document, Types } from 'mongoose';

export type EligibilityDecision = 'ELIGIBLE' | 'INELIGIBLE' | 'PARTIAL';
export type EligibilityServiceCategory =
  | 'OUTPATIENT'
  | 'INPATIENT'
  | 'MATERNITY'
  | 'DENTAL'
  | 'OPTICAL'
  | 'SURGICAL'
  | 'EMERGENCY'
  | 'PHARMACY'
  | 'PREVENTIVE';

export interface VerifyEligibilityInput {
  memberId: string;
  providerId?: string;
  serviceCategory: EligibilityServiceCategory;
  serviceCode?: string;
  serviceDescription?: string;
  serviceDate?: string | Date;
  requestedAmount?: number;
  networkId?: string;
}

export interface EligibilityCheckQuery {
  page?: number | string;
  limit?: number | string;
  decision?: EligibilityDecision;
  serviceCategory?: EligibilityServiceCategory;
  memberId?: string;
  providerId?: string;
  search?: string;
}

export interface BenefitEvaluation {
  category: EligibilityServiceCategory;
  covered: boolean;
  annualLimit?: number;
  annualUsed: number;
  annualRemaining?: number;
  perVisitLimit?: number;
  copayPercentage: number;
  copayAmount: number;
  requiresPreAuth: boolean;
  notes?: string;
}

export interface EligibilityDecisionResult {
  eligible: boolean;
  decision: EligibilityDecision;
  reason?: string;
  reasons: string[];
  checkedAt: Date;
  serviceDate: Date;
  member: {
    id: string;
    policyNumber: string;
    name: string;
    status: string;
    coverageStartDate: Date;
    coverageEndDate?: Date;
  };
  plan: {
    id: string;
    code: string;
    name: string;
    tier?: string;
    status: string;
    annualMaxBenefit?: number;
    annualUsed: number;
    annualRemaining?: number;
  };
  provider?: {
    id: string;
    code: string;
    name: string;
    status: string;
    accreditationStatus?: string;
    networkMatched?: boolean;
  };
  benefit: BenefitEvaluation;
}

export interface IEligibilityCheck extends Document {
  hmoId: Types.ObjectId;
  memberId: Types.ObjectId;
  providerId?: Types.ObjectId;
  serviceCategory: EligibilityServiceCategory;
  serviceCode?: string;
  serviceDescription?: string;
  serviceDate: Date;
  requestedAmount?: number;
  networkId?: string;
  decision: EligibilityDecision;
  eligible: boolean;
  reasons: string[];
  result: EligibilityDecisionResult;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedEligibilityChecksResult {
  checks: IEligibilityCheck[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface EligibilityStats {
  totalChecks: number;
  eligible: number;
  ineligible: number;
  partial: number;
  today: number;
}
