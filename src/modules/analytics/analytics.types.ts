import { Request } from 'express';

export type AnalyticsRange = '7d' | '30d' | '90d' | '12m' | 'custom';
export type ReportType =
  | 'EXECUTIVE'
  | 'CLAIMS'
  | 'FINANCIAL'
  | 'UTILIZATION'
  | 'PROVIDER_PERFORMANCE'
  | 'ENROLLEE'
  | 'COMPLIANCE_AUDIT';
export type ReportFormat = 'JSON' | 'CSV';
export type ReportStatus = 'GENERATED' | 'FAILED';
export type ComplianceStatus = 'DRAFT' | 'READY' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
export type ConsentStatus = 'GRANTED' | 'REVOKED' | 'EXPIRED';

export interface AuthUserLike {
  _id?: string;
  id?: string;
  accountId?: string;
  hmoId?: string;
  role?: string;
  roles?: string[];
  [key: string]: unknown;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserLike;
}

export interface AnalyticsQuery {
  range?: AnalyticsRange;
  from?: string;
  to?: string;
  planId?: string;
  providerId?: string;
}

export interface ReportQuery extends AnalyticsQuery {
  type: ReportType;
  format?: ReportFormat;
}

export interface AuditQuery {
  page?: number;
  limit?: number;
  action?: string;
  resource?: string;
  actorId?: string;
  from?: string;
  to?: string;
}

export interface ConsentInput {
  subjectType: 'MEMBER' | 'PROVIDER' | 'USER';
  subjectId: string;
  purpose: string;
  version: string;
  source?: string;
  expiresAt?: string;
}

export interface ComplianceQuery {
  page?: number;
  limit?: number;
  type?: string;
  status?: ComplianceStatus;
}

export interface AnalyticsSummary {
  period: { from: string; to: string };
  enrolment: {
    total: number;
    active: number;
    suspended: number;
    expired: number;
    newInPeriod: number;
  };
  claims: {
    total: number;
    submitted: number;
    underReview: number;
    approved: number;
    rejected: number;
    paid: number;
    claimedAmount: number;
    approvedAmount: number;
    payableAmount: number;
    paidAmount: number;
    approvalRate: number;
    rejectionRate: number;
    duplicateRiskCount: number;
    monthly: Array<{ month: string; count: number; claimed: number; approved: number; paid: number }>;
    byStatus: Array<{ _id: string; count: number; amount: number }>;
    topProviders: Array<{ _id: string; count: number; amount: number }>;
  };
  authorization: {
    total: number;
    pending: number;
    approved: number;
    declined: number;
    requestedAmount: number;
    approvedAmount: number;
  };
  finance: {
    invoiceCount: number;
    invoicedAmount: number;
    paymentCount: number;
    receivedAmount: number;
    settlementCount: number;
    settledAmount: number;
  };
  providers: {
    total: number;
    active: number;
  };
  plans: {
    total: number;
    active: number;
  };
  security: {
    auditEvents: number;
    accessEvents: number;
    failedAccessEvents: number;
    consentGrants: number;
    consentRevocations: number;
  };
}
