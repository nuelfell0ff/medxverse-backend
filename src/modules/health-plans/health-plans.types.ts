import { Document, Types } from 'mongoose';

export enum HealthPlanStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum HealthPlanType {
  INDIVIDUAL = 'INDIVIDUAL',
  FAMILY = 'FAMILY',
  CORPORATE = 'CORPORATE',
}

export enum BenefitStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum BenefitCategory {
  OUTPATIENT = 'OUTPATIENT',
  INPATIENT = 'INPATIENT',
  MATERNITY = 'MATERNITY',
  DENTAL = 'DENTAL',
  OPTICAL = 'OPTICAL',
  SURGICAL = 'SURGICAL',
  EMERGENCY = 'EMERGENCY',
  PHARMACY = 'PHARMACY',
  LABORATORY = 'LABORATORY',
  RADIOLOGY = 'RADIOLOGY',
  PREVENTIVE = 'PREVENTIVE',
  MENTAL_HEALTH = 'MENTAL_HEALTH',
  AMBULANCE = 'AMBULANCE',
  OTHER = 'OTHER',
}

export enum PremiumFrequency {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL',
}

export interface IPlanPremium {
  individual?: number;
  family?: number;
  corporate?: number;
  currency: string;
  frequency: PremiumFrequency;
}

export interface IBenefitRule {
  covered: boolean;
  coveredServices: string[];
  annualLimitAmount?: number;
  annualUtilizationLimit?: number;
  perVisitLimitAmount?: number;
  copayPercentage: number;
  copayAmount?: number;
  deductibleAmount?: number;
  waitingPeriodDays: number;
  requiresPreAuth: boolean;
  exclusions: string[];
  notes?: string;
}

export interface IBenefitDefinition {
  _id: Types.ObjectId;
  hmoId: Types.ObjectId;
  code: string;
  name: string;
  description?: string;
  category: BenefitCategory;
  status: BenefitStatus;
  defaultRule: IBenefitRule;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBenefitDefinitionDocument extends IBenefitDefinition, Document {}

export interface IPlanBenefit {
  _id: Types.ObjectId;
  hmoId: Types.ObjectId;
  healthPlanId: Types.ObjectId;
  benefitId: Types.ObjectId;
  rule: IBenefitRule;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPlanBenefitDocument extends IPlanBenefit, Document {}

export interface IHealthPlan {
  _id: Types.ObjectId;
  hmoId: Types.ObjectId;
  code: string;
  name: string;
  description?: string;
  type: HealthPlanType;
  status: HealthPlanStatus;
  tier?: string;
  currency: string;
  premium?: IPlanPremium;
  defaultWaitingPeriodDays: number;
  annualUtilizationLimit?: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  benefitIds: Types.ObjectId[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IHealthPlanDocument extends IHealthPlan, Document {}

export interface CreateBenefitDefinitionInput {
  code: string;
  name: string;
  description?: string;
  category: BenefitCategory;
  status?: BenefitStatus;
  defaultRule: IBenefitRule;
}

export interface UpdateBenefitDefinitionInput {
  code?: string;
  name?: string;
  description?: string;
  category?: BenefitCategory;
  status?: BenefitStatus;
  defaultRule?: Partial<IBenefitRule>;
}

export interface CreateHealthPlanInput {
  code: string;
  name: string;
  description?: string;
  type: HealthPlanType;
  status?: HealthPlanStatus;
  tier?: string;
  currency?: string;
  premium?: IPlanPremium;
  defaultWaitingPeriodDays?: number;
  annualUtilizationLimit?: number;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string;
  benefitIds?: string[];
  notes?: string;
}

export interface UpdateHealthPlanInput {
  code?: string;
  name?: string;
  description?: string;
  type?: HealthPlanType;
  tier?: string;
  currency?: string;
  premium?: IPlanPremium;
  defaultWaitingPeriodDays?: number;
  annualUtilizationLimit?: number;
  effectiveFrom?: Date | string;
  effectiveTo?: Date | string | null;
  benefitIds?: string[];
  notes?: string;
}

export interface AttachBenefitInput {
  benefitId: string;
  rule?: Partial<IBenefitRule>;
}

export interface HealthPlanQueryFilters {
  page?: number | string;
  limit?: number | string;
  search?: string;
  status?: HealthPlanStatus;
  type?: HealthPlanType;
  tier?: string;
  effectiveDate?: string;
}

export interface BenefitQueryFilters {
  page?: number | string;
  limit?: number | string;
  search?: string;
  status?: BenefitStatus;
  category?: BenefitCategory;
}

export interface PaginatedHealthPlansResult {
  plans: IHealthPlanDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedBenefitsResult {
  benefits: IBenefitDefinitionDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface HealthPlanStats {
  total: number;
  draft: number;
  active: number;
  inactive: number;
  archived: number;
}

export interface BenefitStats {
  total: number;
  draft: number;
  active: number;
  inactive: number;
  archived: number;
}

export interface EligibilityCheckInput {
  planId: string;
  benefitId?: string;
  benefitCode?: string;
  serviceDate?: Date | string;
  coverageStartDate: Date | string;
  requestedAmount?: number;
  annualUsedAmount?: number;
  annualUsedVisits?: number;
}

export interface EligibilityCheckResult {
  eligible: boolean;
  planId: string;
  benefitId?: string;
  benefitCode?: string;
  benefitName?: string;
  category?: BenefitCategory;
  reason?: string;
  covered: boolean;
  requiresPreAuth: boolean;
  waitingPeriodDays: number;
  remainingAnnualAmount?: number;
  remainingAnnualVisits?: number;
  requestedAmount: number;
  estimatedCopayAmount: number;
  estimatedDeductibleAmount: number;
  estimatedHmoPayableAmount: number;
}
