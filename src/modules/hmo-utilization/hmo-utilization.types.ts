import { Types } from 'mongoose';

export enum UtilizationEventType {
  VISIT = 'VISIT',
  ADMISSION = 'ADMISSION',
  PROCEDURE = 'PROCEDURE',
  PHARMACY = 'PHARMACY',
  LABORATORY = 'LABORATORY',
  IMAGING = 'IMAGING',
  OTHER = 'OTHER',
}

export enum UtilizationSourceType {
  CLAIM = 'CLAIM',
  PRE_AUTH = 'PRE_AUTH',
  ELIGIBILITY = 'ELIGIBILITY',
  BILLING = 'BILLING',
  MANUAL = 'MANUAL',
}

export enum RiskSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AlertStatus {
  OPEN = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  INVESTIGATING = 'INVESTIGATING',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export enum FraudCaseStatus {
  OPEN = 'OPEN',
  INVESTIGATING = 'INVESTIGATING',
  CONFIRMED = 'CONFIRMED',
  DISMISSED = 'DISMISSED',
  RECOVERED = 'RECOVERED',
  CLOSED = 'CLOSED',
}

export enum FraudEntityType {
  MEMBER = 'MEMBER',
  PROVIDER = 'PROVIDER',
  CLAIM = 'CLAIM',
  BILLING = 'BILLING',
  MULTIPLE = 'MULTIPLE',
}

export enum RuleOperator {
  GT = 'GT',
  GTE = 'GTE',
  LT = 'LT',
  LTE = 'LTE',
  EQ = 'EQ',
  NEQ = 'NEQ',
}

export interface UtilizationEventInput {
  memberId: string;
  providerId?: string;
  claimId?: string;
  preAuthorizationId?: string;
  serviceCode?: string;
  serviceName?: string;
  category?: UtilizationEventType;
  sourceType?: UtilizationSourceType;
  serviceDate: string | Date;
  quantity?: number;
  amount?: number;
  diagnosisCodes?: string[];
  metadata?: Record<string, unknown>;
}

export interface UtilizationQueryFilters {
  page?: number | string;
  limit?: number | string;
  memberId?: string;
  providerId?: string;
  category?: UtilizationEventType;
  sourceType?: UtilizationSourceType;
  fromDate?: string;
  toDate?: string;
  minAmount?: number | string;
  maxAmount?: number | string;
  search?: string;
}

/**
 * Filters used when querying fraud alerts / fraud activity.
 */
export interface FraudQueryFilters {
  page?: number | string;
  limit?: number | string;
  status?: AlertStatus;
  severity?: RiskSeverity;
  memberId?: string;
  providerId?: string;
  ruleId?: string;
  search?: string;
}

export interface AlertQueryFilters {
  page?: number | string;
  limit?: number | string;
  status?: AlertStatus;
  severity?: RiskSeverity;
  memberId?: string;
  providerId?: string;
  ruleId?: string;
}

export interface FraudCaseQueryFilters {
  page?: number | string;
  limit?: number | string;
  status?: FraudCaseStatus;
  severity?: RiskSeverity;
  entityType?: FraudEntityType;
  memberId?: string;
  providerId?: string;
  search?: string;
}

export interface CreateFraudRuleInput {
  code: string;
  name: string;
  description?: string;
  category: string;
  entityType?: FraudEntityType;
  severity?: RiskSeverity;
  enabled?: boolean;
  threshold?: number;
  operator?: RuleOperator;
  windowDays?: number;
  action?: 'ALERT' | 'CASE';
}

export interface UpdateFraudRuleInput {
  name?: string;
  description?: string;
  category?: string;
  entityType?: FraudEntityType;
  severity?: RiskSeverity;
  enabled?: boolean;
  threshold?: number;
  operator?: RuleOperator;
  windowDays?: number;
  action?: 'ALERT' | 'CASE';
}

export interface ReviewAlertInput {
  status: AlertStatus;
  note?: string;
}

export interface CreateFraudCaseInput {
  alertId?: string;
  title: string;
  description?: string;
  severity?: RiskSeverity;
  entityType?: FraudEntityType;
  memberId?: string;
  providerId?: string;
  claimIds?: string[];
  estimatedLoss?: number;
  notes?: string;
}

export interface UpdateFraudCaseInput {
  status?: FraudCaseStatus;
  severity?: RiskSeverity;
  assignedTo?: string;
  finding?: string;
  recoveredAmount?: number;
  notes?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type ObjectIdLike = Types.ObjectId | string;