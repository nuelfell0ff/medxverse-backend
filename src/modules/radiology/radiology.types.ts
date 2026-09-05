import { Document, Types } from 'mongoose';

export enum ImagingModality {
  XRAY = 'XRAY',
  CT = 'CT',
  MRI = 'MRI',
  ULTRASOUND = 'ULTRASOUND',
  MAMMOGRAPHY = 'MAMMOGRAPHY',
  FLUOROSCOPY = 'FLUOROSCOPY',
  NUCLEAR_MEDICINE = 'NUCLEAR_MEDICINE',
  PET = 'PET',
  INTERVENTIONAL = 'INTERVENTIONAL',
  OTHER = 'OTHER',
}

export enum RadiologyOrderStatus {
  REQUESTED = 'REQUESTED',
  SCHEDULED = 'SCHEDULED',
  PATIENT_ARRIVED = 'PATIENT_ARRIVED',
  PREPARING = 'PREPARING',
  READY_FOR_EXAM = 'READY_FOR_EXAM',
  IN_PROGRESS = 'IN_PROGRESS',
  IMAGE_ACQUISITION_COMPLETE = 'IMAGE_ACQUISITION_COMPLETE',
  REPORTING = 'REPORTING',
  REPORTED = 'REPORTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PriorityLevel {
  STAT = 'STAT',
  URGENT = 'URGENT',
  ROUTINE = 'ROUTINE',
}

export enum AssignmentRole {
  RADIOLOGIST = 'RADIOLOGIST',
  RADIOGRAPHER = 'RADIOGRAPHER',
  TECHNOLOGIST = 'TECHNOLOGIST',
  NURSE = 'NURSE',
  ADMIN = 'ADMIN',
}

export enum ExaminationQueueStatus {
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ON_HOLD = 'ON_HOLD',
}

export enum ReportStatus {
  DRAFT = 'DRAFT',
  FINAL = 'FINAL',
  AMENDED = 'AMENDED',
}

export enum CriticalResultStatus {
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  PENDING = 'PENDING',
  NOTIFIED = 'NOTIFIED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
}

export enum PregnancyScreeningStatus {
  NOT_REQUIRED = 'NOT_REQUIRED',
  PENDING = 'PENDING',
  NEGATIVE = 'NEGATIVE',
  POSITIVE = 'POSITIVE',
  UNKNOWN = 'UNKNOWN',
}

export enum ContrastStatus {
  NOT_REQUIRED = 'NOT_REQUIRED',
  PLANNED = 'PLANNED',
  ADMINISTERED = 'ADMINISTERED',
  DECLINED = 'DECLINED',
  CONTRAINDICATED = 'CONTRAINDICATED',
}

export enum AIStudyPriority {
  NOT_PROCESSED = 'NOT_PROCESSED',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum RadiologyBillingStatus {
  NOT_ATTEMPTED = 'NOT_ATTEMPTED',
  CAPTURED = 'CAPTURED',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
}

export interface RadiologyAssignedStaff {
  _id: Types.ObjectId;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  title?: string;
  role?: string;
  jobTitle?: string;
  professionalTitle?: string;
  staffId?: string;
}

export interface RadiologyAssignment {
  userId: Types.ObjectId | RadiologyAssignedStaff;
  role: AssignmentRole;
  assignedAt: Date;
  assignedBy?: Types.ObjectId | {
    _id: Types.ObjectId;
    firstName?: string;
    lastName?: string;
    role?: string;
  };
  notes?: string;
}

export interface RadiologyScheduling {
  scheduledDate?: Date;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  estimatedDurationMinutes?: number;
  modalityId?: Types.ObjectId;
  theatreOrRoom?: string;
  scheduledBy?: Types.ObjectId;
}

export interface ProcedureTracking {
  queuedAt?: Date;
  patientArrivedAt?: Date;
  preparationStartedAt?: Date;
  readyAt?: Date;
  examinationStartedAt?: Date;
  imageAcquisitionCompletedAt?: Date;
  reportingStartedAt?: Date;
  reportedAt?: Date;
  completedAt?: Date;
}

export interface PatientPreparation {
  instructions?: string;
  fastingRequired?: boolean;
  fastingHours?: number;
  hydrationRequired?: boolean;
  medicationInstructions?: string;
  preparationCompleted?: boolean;
  preparationNotes?: string;
}

export interface ContrastDetails {
  status?: ContrastStatus;
  contrastName?: string;
  contrastType?: string;
  dose?: number;
  doseUnit?: string;
  route?: string;
  administeredAt?: Date;
  administeredBy?: Types.ObjectId;
  reactionObserved?: boolean;
  reactionDescription?: string;
  notes?: string;
}

export interface PregnancyScreening {
  status?: PregnancyScreeningStatus;
  screenedAt?: Date;
  screenedBy?: Types.ObjectId;
  testType?: string;
  testResult?: string;
  notes?: string;
}

export interface RadiationExposure {
  dose?: number;
  doseUnit?: string;
  doseAreaProduct?: number;
  doseAreaProductUnit?: string;
  ctDoseIndex?: number;
  doseLengthProduct?: number;
  recordedAt?: Date;
  recordedBy?: Types.ObjectId;
  notes?: string;
}

export interface PacsImage {
  _id?: Types.ObjectId;
  url: string;
  secureUrl: string;
  publicId: string;
  originalFilename?: string;
  format?: string;
  resourceType?: string;
  bytes?: number;
  width?: number;
  height?: number;
  uploadedAt: Date;
  uploadedBy?: Types.ObjectId;
}

export interface PacsMetadata {
  studyInstanceUid?: string;
  seriesInstanceUid?: string;
  accessionNumber?: string;
  studyId?: string;
  studyDate?: Date;
  imageCount?: number;
  seriesCount?: number;
  modality?: ImagingModality;
  dicomViewerUrl?: string;
  dicomFileKeys?: string[];
  storageLocation?: string;
  storageStatus?: 'PENDING' | 'STORED' | 'ARCHIVED' | 'FAILED';
  keyImageIds?: string[];
  priorStudyInstanceUids?: string[];
  exportEnabled?: boolean;
  sharedLink?: string;
  sharedLinkExpiresAt?: Date;
  images?: PacsImage[];
}

export interface CriticalResult {
  status?: CriticalResultStatus;
  finding?: string;
  notifiedUserId?: Types.ObjectId | string;
  notifiedAt?: Date;
  acknowledgedAt?: Date;
  notificationMethod?: 'PHONE' | 'SMS' | 'EMAIL' | 'IN_APP';
  notificationNotes?: string;
}

export interface ReportVersion {
  version: number;
  findings: string;
  impression: string;
  radiologistNotes?: string;
  status: ReportStatus;
  createdBy: Types.ObjectId;
  createdAt: Date;
  signedAt?: Date;
}

export interface RadiologyReport {
  status?: ReportStatus;
  findings?: string;
  impression?: string;
  radiologistNotes?: string;
  templateId?: string;
  version?: number;
  draftedAt?: Date;
  signedAt?: Date;
  signedBy?: Types.ObjectId;
  amendedAt?: Date;
  amendmentReason?: string;
  criticalResult?: CriticalResult;
  versions?: ReportVersion[];
}

export interface AIAnalysis {
  enabled?: boolean;
  modelName?: string;
  modelVersion?: string;
  processedAt?: Date;
  priority?: AIStudyPriority;
  confidence?: number;
  findings?: string[];
  measurements?: Record<string, number>;
  recommendations?: string[];
  qualityPassed?: boolean;
  qualityNotes?: string;
}

export interface RadiologyBilling {
  status: RadiologyBillingStatus;
  chargeIds: Types.ObjectId[];
  errors: string[];
  lastAttemptAt?: Date;
  capturedAt?: Date;
  catalogueItemId?: Types.ObjectId;
  catalogueCode?: string;
  cataloguePlanName?: string;
  cataloguePrice?: number;
  catalogueVersion?: number;
  catalogueCurrency?: string;
}

export interface IRadiologyOrder {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  orderingDoctorId: Types.ObjectId;
  radiologistId?: Types.ObjectId;
  modality: ImagingModality;
  procedureName: string;
  bodyPart: string;
  clinicalIndication: string;
  priority: PriorityLevel;
  status: RadiologyOrderStatus;
  accessionNumber?: string;
  scheduling?: RadiologyScheduling;
  assignments?: RadiologyAssignment[];
  procedureTracking?: ProcedureTracking;
  patientPreparation?: PatientPreparation;
  contrast?: ContrastDetails;
  pregnancyScreening?: PregnancyScreening;
  radiationExposure?: RadiationExposure;
  pacsMetadata?: PacsMetadata;
  report?: RadiologyReport;
  findings?: string;
  impression?: string;
  radiologistNotes?: string;
  reportedAt?: Date;
  cancellationReason?: string;
  queuePosition?: number;
  queueStatus?: ExaminationQueueStatus;
  aiAnalysis?: AIAnalysis;

  /** Selected centralized Billing pricing catalogue for this examination. */
  pricingCatalogueItemId?: Types.ObjectId;
  pricingCatalogueCode?: string;
  pricingCataloguePlanName?: string;
  pricingCataloguePrice?: number;
  pricingCatalogueVersion?: number;
  pricingCatalogueCurrency?: string;

  billing?: RadiologyBilling;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRadiologyOrderDocument extends IRadiologyOrder, Document {
  _id: Types.ObjectId;
}

export interface CreateRadiologyOrderInput {
  hospitalId: string;
  patientId: string;
  orderingDoctorId: string;
  modality: ImagingModality;
  procedureName: string;
  bodyPart: string;
  clinicalIndication: string;
  priority?: PriorityLevel;
  accessionNumber?: string;
  pricingCatalogueItemId?: string;
  scheduling?: {
    scheduledDate?: string | Date;
    scheduledStartTime?: string;
    scheduledEndTime?: string;
    estimatedDurationMinutes?: number;
    modalityId?: string;
    theatreOrRoom?: string;
  };
  patientPreparation?: PatientPreparation;
  contrast?: ContrastDetails;
  pregnancyScreening?: PregnancyScreening;
}

export interface UpdateRadiologyOrderInput {
  procedureName?: string;
  bodyPart?: string;
  clinicalIndication?: string;
  modality?: ImagingModality;
  priority?: PriorityLevel;
  scheduling?: Partial<{
    scheduledDate: string | Date;
    scheduledStartTime: string;
    scheduledEndTime: string;
    estimatedDurationMinutes: number;
    modalityId: string;
    theatreOrRoom: string;
    scheduledBy: string;
  }>;
  patientPreparation?: PatientPreparation;
}

export interface GetRadiologyOrdersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: RadiologyOrderStatus;
  modality?: ImagingModality;
  priority?: PriorityLevel;
  patientId?: string;
  orderingDoctorId?: string;
  radiologistId?: string;
  queueStatus?: ExaminationQueueStatus;
  scheduledDate?: string;
}

export interface UpdateExaminationStatusInput {
  status: RadiologyOrderStatus;
  notes?: string;
}

export interface UpdateQueueInput {
  queuePosition?: number;
  queueStatus?: ExaminationQueueStatus;
}

export interface UploadPacsImagesInput {
  files: Express.Multer.File[];
}

export interface DeletePacsImageInput {
  imageId: string;
}

export interface UpdatePacsMetadataInput {
  studyInstanceUid?: string;
  seriesInstanceUid?: string;
  accessionNumber?: string;
  studyId?: string;
  studyDate?: string | Date;
  imageCount?: number;
  seriesCount?: number;
  modality?: ImagingModality;
  dicomViewerUrl?: string;
  dicomFileKeys?: string[];
  storageLocation?: string;
  storageStatus?: 'PENDING' | 'STORED' | 'ARCHIVED' | 'FAILED';
  keyImageIds?: string[];
  priorStudyInstanceUids?: string[];
  exportEnabled?: boolean;
  sharedLink?: string;
  sharedLinkExpiresAt?: string | Date;
}

export interface AssignRadiologyStaffInput {
  userId: string;
  role: AssignmentRole;
  notes?: string;
}

export interface UpdateContrastInput {
  status?: ContrastStatus;
  contrastName?: string;
  contrastType?: string;
  dose?: number;
  doseUnit?: string;
  route?: string;
  reactionObserved?: boolean;
  reactionDescription?: string;
  notes?: string;
}

export interface UpdatePregnancyScreeningInput {
  status?: PregnancyScreeningStatus;
  testType?: string;
  testResult?: string;
  notes?: string;
}

export interface UpdateRadiationExposureInput {
  dose?: number;
  doseUnit?: string;
  doseAreaProduct?: number;
  doseAreaProductUnit?: string;
  ctDoseIndex?: number;
  doseLengthProduct?: number;
  notes?: string;
}

export interface CompleteRadiologyReportInput {
  radiologistId: string;
  findings: string;
  impression: string;
  radiologistNotes?: string;
  templateId?: string;
  criticalResult?: {
    status?: CriticalResultStatus;
    finding?: string;
    notifiedUserId?: string;
    notificationMethod?: 'PHONE' | 'SMS' | 'EMAIL' | 'IN_APP';
    notificationNotes?: string;
  };
}

export interface SignRadiologyReportInput {
  radiologistId: string;
}

export interface AmendRadiologyReportInput {
  radiologistId: string;
  findings: string;
  impression: string;
  radiologistNotes?: string;
  amendmentReason: string;
}

export interface UpdateAIAnalysisInput {
  enabled?: boolean;
  modelName?: string;
  modelVersion?: string;
  priority?: AIStudyPriority;
  confidence?: number;
  findings?: string[];
  measurements?: Record<string, number>;
  recommendations?: string[];
  qualityPassed?: boolean;
  qualityNotes?: string;
}