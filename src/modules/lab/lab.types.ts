import { Document, Types } from 'mongoose';

/* =========================================================
   ENUMS
========================================================= */

export enum LabOrderStatus {
  PENDING = 'PENDING',
  SAMPLE_SCHEDULED = 'SAMPLE_SCHEDULED',
  SAMPLE_COLLECTED = 'SAMPLE_COLLECTED',
  SPECIMEN_RECEIVED = 'SPECIMEN_RECEIVED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESULTS_RECORDED = 'RESULTS_RECORDED',
  VERIFIED = 'VERIFIED',
  AUTHORIZED = 'AUTHORIZED',
  COMPLETED = 'COMPLETED',
  SAMPLE_REJECTED = 'SAMPLE_REJECTED',
  RECOLLECTION_REQUIRED = 'RECOLLECTION_REQUIRED',
  CANCELLED = 'CANCELLED',
}

export enum LabBillingStatus {
  NOT_ATTEMPTED = 'NOT_ATTEMPTED',
  CAPTURED = 'CAPTURED',
  FAILED = 'FAILED',
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
  CONTAMINATED = 'CONTAMINATED',
  LEAKING = 'LEAKING',
  IMPROPERLY_LABELED = 'IMPROPERLY_LABELED',
  DELAYED_TRANSPORT = 'DELAYED_TRANSPORT',
}

export enum EntryMethod {
  MANUAL = 'MANUAL',
  ANALYZER_AUTOMATED = 'ANALYZER_AUTOMATED',
  AI_PATTERN = 'AI_PATTERN',
  IMPORTED = 'IMPORTED',
}

export enum SampleRoutingStatus {
  PENDING = 'PENDING',
  ROUTED = 'ROUTED',
  RECEIVED_BY_SECTION = 'RECEIVED_BY_SECTION',
  IN_ANALYSIS = 'IN_ANALYSIS',
  COMPLETED = 'COMPLETED',
}

export enum AuthorizationLevel {
  TECHNICIAN = 'TECHNICIAN',
  VERIFIER = 'VERIFIER',
  SENIOR_SCIENTIST = 'SENIOR_SCIENTIST',
  PATHOLOGIST = 'PATHOLOGIST',
  LAB_DIRECTOR = 'LAB_DIRECTOR',
}

/* =========================================================
   SUB-INTERFACES
========================================================= */

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
  analyzerName?: string;
  analyzerResultId?: string;
  isRepeat?: boolean;
  repeatReason?: string;
  dilutionFactor?: number;
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
  recollectionScheduledAt?: Date;
}

export interface ISampleRouting {
  department: LabDepartment;
  routedAt?: Date;
  routedBy?: Types.ObjectId;
  receivedAt?: Date;
  receivedBy?: Types.ObjectId;
  location?: string;
  status: SampleRoutingStatus;
}

export interface IResultAuthorization {
  level: AuthorizationLevel;
  authorizedBy: Types.ObjectId;
  authorizedAt: Date;
  notes?: string;
}

export interface IResultAmendment {
  amendedBy: Types.ObjectId;
  amendedAt: Date;
  reason: string;
  previousResults: ILabResultField[];
  newResults: ILabResultField[];
  version: number;
}

export interface IRepeatTest {
  repeatedAt: Date;
  repeatedBy: Types.ObjectId;
  reason: string;
  parameterNames?: string[];
  dilutionFactor?: number;
  notes?: string;
}

export interface IReflexTest {
  triggeredAt: Date;
  triggeredBy?: Types.ObjectId;
  ruleName: string;
  reason: string;
  triggeredTestName: string;
  triggeredOrderId?: Types.ObjectId;
}

export interface ITestPanelItem {
  parameterName: string;
  unit?: string;
  referenceRange?: string;
  criticalLow?: number;
  criticalHigh?: number;
}

export interface ILabReferenceRange {
  parameterName: string;
  unit?: string;
  minimumAge?: number;
  maximumAge?: number;
  sex?: 'MALE' | 'FEMALE' | 'ANY';
  lowerValue?: number;
  upperValue?: number;
  displayRange: string;
}

/* =========================================================
   LAB ORDER
========================================================= */

export interface ILabOrder {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  consultationId?: Types.ObjectId;

  accessionNumber: string;
  barcodeUrl?: string;
  qrCodeUrl?: string;

  testCatalogId?: Types.ObjectId;
  testName: string;
  testCategory: LabDepartment;
  panelName?: string;

  priority: LabPriority;
  isStat: boolean;

  status: LabOrderStatus;

  sampleType: string;
  sampleCollectionScheduledAt?: Date;
  sampleCollectedAt?: Date;
  phlebotomistId?: Types.ObjectId;

  specimenQuality?: SpecimenQuality;
  specimenReceivedAt?: Date;

  sampleRouting?: ISampleRouting;

  chainOfCustody: IChainOfCustody[];
  rejectionInfo?: ISpecimenRejection;

  results: ILabResultField[];

  labTechnicianId?: Types.ObjectId;
  verifierId?: Types.ObjectId;

  verifiedAt?: Date;
  authorizedAt?: Date;
  completedAt?: Date;

  authorizationHistory: IResultAuthorization[];

  version: number;
  amendmentHistory: IResultAmendment[];

  repeatTests: IRepeatTest[];
  reflexTests: IReflexTest[];

  aiPatternAlerts: string[];
  deltaCheckTriggered: boolean;
  criticalResultNotified: boolean;

  duplicateTestDetected: boolean;
  duplicateTestMessage?: string;

  predictedTatMinutes?: number;

  /** Centralized billing integration. */
  billingStatus: LabBillingStatus;
  billingChargeId?: Types.ObjectId;
  billingServiceCode?: string;
  billingAmount?: number;
  billingCurrency?: string;
  billingError?: string;
  billingCapturedAt?: Date;

  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface ILabOrderDocument extends ILabOrder, Document {
  _id: Types.ObjectId;
}

/* =========================================================
   TEST CATALOG
========================================================= */

export interface ITestCatalogParameter {
  name: string;
  unit?: string;
  defaultRefRange?: string;
  criticalLow?: number;
  criticalHigh?: number;
}

export interface ITestCatalog {
  hospitalId: Types.ObjectId;

  code: string;
  name: string;

  department: LabDepartment;
  sampleType: string;

  parameters: ITestCatalogParameter[];

  isPanel: boolean;
  panelTests?: string[];

  estimatedTatMinutes?: number;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface ITestCatalogDocument extends ITestCatalog, Document {
  _id: Types.ObjectId;
}

/* =========================================================
   DTOs
========================================================= */

export interface CreateLabOrderDTO {
  patientId: string;

  doctorId?: string;
  consultationId?: string;

  testCatalogId?: string;

  testName: string;
  testCategory: LabDepartment;
  panelName?: string;

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

  recollectionScheduledAt?: string;
}

export interface AmendResultsDTO {
  results: ILabResultField[];

  reason: string;

  notes?: string;
}

export interface RepeatTestDTO {
  reason: string;

  parameterNames?: string[];

  dilutionFactor?: number;

  notes?: string;
}

export interface AccessionSpecimenDTO {
  location?: string;
}

export interface GetLabOrdersQueryDTO {
  patientId?: string;
  doctorId?: string;

  status?: LabOrderStatus;
  priority?: LabPriority;
  department?: LabDepartment;

  accessionNumber?: string;

  isStat?: boolean | string;

  page?: string;
  limit?: string;
}