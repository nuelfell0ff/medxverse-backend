import { Document, Types } from 'mongoose';

export interface IClaimsPipelineStats {
  submitted: number;
  underReview: number;
  approved: number;
  denied: number;
  settled: number;
}

export interface IFinancialSummaryStats {
  claimsValueOnFile: number;
  settledToProviders: number;
  approvedAwaitingPayment: number;
  exposureUnderReview: number;
  deniedValue: number;
}

export interface IEnrolledMembersOverview {
  totalEnrolled: number;
  activePlansCount: number;
}

export interface IOverviewCardsStats {
  enrolledMembers: IEnrolledMembersOverview;
  pendingReview: {
    count: number;
    draftCount: number;
  };
  approvedClaims: {
    count: number;
    settledAmount: number;
  };
  deniedClaims: {
    count: number;
    volumePercentage: number;
  };
}

export interface IHmsDashboardMetrics {
  overview: IOverviewCardsStats;
  pipeline: IClaimsPipelineStats;
  financialSummary: IFinancialSummaryStats;
}

export interface IHmsDashboardSettings {
  hmoId: Types.ObjectId;
  defaultTimeframe: 'today' | 'this_week' | 'this_month' | 'this_year';
  customWidgets: string[];
  refreshIntervalMinutes: number;
}

export interface IHmsDashboardSettingsDocument extends IHmsDashboardSettings, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateDashboardSettingsInput {
  defaultTimeframe?: 'today' | 'this_week' | 'this_month' | 'this_year';
  customWidgets?: string[];
  refreshIntervalMinutes?: number;
}