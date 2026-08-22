import { Document, Types } from 'mongoose';

// Enums for Workflows & Departments
export enum LabOrderStatus {
  PENDING = 'PENDING',
  SAMPLE_SCHEDULED = 'SAMPLE_SCHEDULED',
  SAMPLE_COLLECTED = 'SAMPLE_COLLECTED',
  SPECIMEN_RECEIVED = 'SPECIMEN_RECEIVED',
  IN_PROGRESS = 'IN_PROGRESS',
  SAMPLE_REJECTED = 'SAMPLE_REJECTED',
  VERIFIED = 'VERIFIED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum LabPriority {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  STAT = 'STAT',
}

export enum LabDepartment {
  HAEMATOLOGY = 'HAEMATOLOGY',
  CLINICAL_CHEMISTRY = 'CLINICAL_CHEMISTRY',
  MICROBIOLOGY = 'MICROBIOLOGY',
  PARASITOLOGY = 'PARASITOLOGY',
  IMMUNOLOGY_SEROLOGY = 'IMMUNOLOGY_SEROLOGY',
  HISTOPATHOLOGY = 'HISTOPATHOLOGY',
  CYTOLOGY = 'CYTOLOGY',
  MOLECULAR_DIAGNOSTICS = 'MOLECULAR_DIAGNOSTICS',
  BLOOD_BANK = 'BLOOD_BANK',
  GENETICS = 'GENETICS',
}

export enum ResultFlag {
  NORMAL = 'NORMAL',
  ABNORMAL = 'ABNORMAL',
  CRITICAL = 'CRITICAL',
  DELTA_CHECK_WARNING = 'DELTA_CHECK_WARNING',
}

export enum SpecimenQuality {
  SATISFACTORY = 'SATISFACTORY',
  HEMOLYZED = 'HEMOLYZED',
  LIPEMIC = 'LIPEMIC',
  CLOTTED = 'CLOTTED',
  INSUFFICIENT_VOLUME = 'INSUFFICIENT_VOLUME',
}

export enum EntryMethod {
  MANUAL = 'MANUAL',
  ANALYZER_AUTOMATED = 'ANALYZER_AUTOMATED',
  AI_PATTERN = 'AI_PATTERN',
}

// Sub-Interfaces
export interface ILabResultField {
  parameterName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  ageSexSpecificRange?: string;
  flag: ResultFlag;
  previousValue?: string;
  deltaPercentage?: number;
  entryMethod: EntryMethod;
}

export interface IChainOfCustody {
  timestamp: Date;
  action: string;
  performedBy: Types.ObjectId;
  location?: string;
  notes?: string;
}

export interface ISpecimenRejection {
  rejectedBy: Types.ObjectId;
  reason: string;
  quality: SpecimenQuality;
  rejectionDate: Date;
  recollectionRequested: boolean;
}

export interface ILabOrder {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  consultationId?: Types.ObjectId;
  accessionNumber: string;
  barcodeUrl?: string;
  
  // Test Catalog & Routing
  testCatalogId?: Types.ObjectId;
  testName: string;
  testCategory: LabDepartment;
  priority: LabPriority;
  isStat: boolean;
  status: LabOrderStatus;
  
  // Phlebotomy & Specimen Management
  sampleType: string;
  sampleCollectionScheduledAt?: Date;
  sampleCollectedAt?: Date;
  phlebotomistId?: Types.ObjectId;
  specimenQuality?: SpecimenQuality;
  chainOfCustody: IChainOfCustody[];
  rejectionInfo?: ISpecimenRejection;
  
  // Results & Multi-Level Verification
  results: ILabResultField[];
  labTechnicianId?: Types.ObjectId;
  verifierId?: Types.ObjectId;
  verifiedAt?: Date;
  completedAt?: Date;
  version: number;
  amendmentHistory?: Array<{
    amendedBy: Types.ObjectId;
    amendedAt: Date;
    reason: string;
    previousResults: ILabResultField[];
  }>;

  // AI & Advanced Intelligence
  aiPatternAlerts?: string[];
  deltaCheckTriggered: boolean;
  criticalResultNotified: boolean;
  predictedTatMinutes?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILabOrderDocument extends ILabOrder, Document {
  _id: Types.ObjectId;
}

// Test Catalog Interfaces
export interface ITestCatalog {
  hospitalId: Types.ObjectId;
  code: string;
  name: string;
  department: LabDepartment;
  sampleType: string;
  parameters: Array<{
    name: string;
    unit: string;
    defaultRefRange: string;
    criticalLow?: number;
    criticalHigh?: number;
  }>;
  isActive: boolean;
}

export interface ITestCatalogDocument extends ITestCatalog, Document {
  _id: Types.ObjectId;
}

// DTOs
export interface CreateLabOrderDTO {
  patientId: string;
  doctorId?: string;
  consultationId?: string;
  testCatalogId?: string;
  testName: string;
  testCategory: LabDepartment;
  priority?: LabPriority;
  isStat?: boolean;
  sampleType: string;
  sampleCollectionScheduledAt?: string;
  notes?: string;
}

export interface RecordLabResultsDTO {
  results: ILabResultField[];
  specimenQuality?: SpecimenQuality;
  notes?: string;
}

export interface RejectSampleDTO {
  reason: string;
  quality: SpecimenQuality;
  requestRecollection: boolean;
}

export interface GetLabOrdersQueryDTO {
  patientId?: string;
  doctorId?: string;
  status?: LabOrderStatus;
  priority?: LabPriority;
  department?: LabDepartment;
  accessionNumber?: string;
  isStat?: boolean;
  page?: string;
  limit?: string;
}