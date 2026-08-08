import { Document, Types } from 'mongoose';

export enum ReportType {
  CLAIMS_SUMMARY = 'CLAIMS_SUMMARY',
  FINANCIAL_OVERVIEW = 'FINANCIAL_OVERVIEW',
  PROVIDER_PERFORMANCE = 'PROVIDER_PERFORMANCE',
  MEMBER_UTILIZATION = 'MEMBER_UTILIZATION',
  PRE_AUTH_METRICS = 'PRE_AUTH_METRICS',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum ReportFormat {
  JSON = 'JSON',
  CSV = 'CSV',
  PDF = 'PDF',
}

export interface IReportFilterParams {
  startDate?: string;
  endDate?: string;
  providerId?: string;
  status?: string;
}

export interface IReportDocument extends Document {
  _id: Types.ObjectId;
  hmoId: Types.ObjectId;
  title: string;
  type: ReportType;
  format: ReportFormat;
  status: ReportStatus;
  parameters: IReportFilterParams;
  generatedBy: Types.ObjectId;
  fileUrl?: string;
  dataSummary?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerateReportInput {
  title: string;
  type: ReportType;
  format?: ReportFormat;
  parameters: IReportFilterParams;
}

export interface ReportQueryFilters {
  page?: number;
  limit?: number;
  type?: ReportType;
  status?: ReportStatus;
}

export interface PaginatedReportsResult {
  reports: IReportDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}