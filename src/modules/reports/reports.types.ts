import { Document, Types } from 'mongoose';

export enum ReportType {
  REVENUE_SUMMARY = 'REVENUE_SUMMARY',
  BED_OCCUPANCY = 'BED_OCCUPANCY',
  PATIENT_DEMOGRAPHICS = 'PATIENT_DEMOGRAPHICS',
  APPOINTMENT_ANALYTICS = 'APPOINTMENT_ANALYTICS',
  LAB_WORKLOAD = 'LAB_WORKLOAD',
  EMERGENCY_STATS = 'EMERGENCY_STATS',
}

export interface IDateRangeFilter {
  startDate?: string;
  endDate?: string;
}

export interface IRevenueReport {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  paymentMethodBreakdown: {
    method: string;
    amount: number;
  }[];
  monthlyTrend: {
    year: number;
    month: number;
    invoiced: number;
    paid: number;
  }[];
}

export interface IBedOccupancyReport {
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRatePercentage: number;
  wardBreakdown: {
    wardId: string;
    wardName: string;
    total: number;
    occupied: number;
    occupancyRatePercentage: number;
  }[];
}

export interface IPatientDemographicsReport {
  totalPatients: number;
  genderBreakdown: {
    gender: string;
    count: number;
  }[];
  ageGroupBreakdown: {
    ageGroup: string;
    count: number;
  }[];
}

export interface IExecutiveSummary {
  totalActivePatients: number;
  totalDoctors: number;
  totalInpatients: number;
  monthlyRevenue: number;
  bedOccupancyRate: number;
  pendingLabOrders: number;
  emergencyCasesToday: number;
}

export interface ISavedReport {
  hospitalId: Types.ObjectId;
  title: string;
  type: ReportType;
  generatedBy: Types.ObjectId;
  parameters: Record<string, any>;
  summaryData: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISavedReportDocument extends ISavedReport, Document {}

export interface ICreateSavedReportDTO {
  title: string;
  type: ReportType;
  parameters: Record<string, any>;
  summaryData: Record<string, any>;
}

export interface IReportQueryFilters extends IDateRangeFilter {
  page?: number;
  limit?: number;
  type?: ReportType;
}