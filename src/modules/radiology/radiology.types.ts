import { Document, Types } from 'mongoose';

export enum ImagingModality {
  X_RAY = 'X_RAY',
  CT_SCAN = 'CT_SCAN',
  MRI = 'MRI',
  ULTRASOUND = 'ULTRASOUND',
  MAMMOGRAPHY = 'MAMMOGRAPHY',
  PET_SCAN = 'PET_SCAN',
  DEXA = 'DEXA',
  NUCLEAR_MEDICINE = 'NUCLEAR_MEDICINE',
  FLUOROSCOPY = 'FLUOROSCOPY',
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
  AWAITING_REPORT = 'AWAITING_REPORT',
  REPORTING = 'REPORTING',
  REPORTED = 'REPORTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  POSTPONED = 'POSTPONED',
}

export enum PriorityLevel {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  STAT = 'STAT',
}

export enum ExaminationQueueStatus {
  WAITING = 'WAITING',
  CALLED = 'CALLED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum AssignmentRole {
  RADIOLOGIST = 'RADIOLOGIST',
  LEAD_TECHNOLOGIST = 'LEAD_TECHNOLOGIST',
  TECHNOLOGIST = 'TECHNOLOGIST',
  ASSISTANT = 'ASSISTANT',
}

export enum ReportStatus {
  DRAFT = 'DRAFT',
  FINAL = 'FINAL',
  AMENDED = 'AMENDED',
  CANCELLED = 'CANCELLED',
}

export enum CriticalResultStatus {
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  PENDING_NOTIFICATION = 'PENDING_NOTIFICATION',
  NOTIFIED = 'NOTIFIED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
}

export enum PregnancyScreeningStatus {
  NOT_REQUIRED = 'NOT_REQUIRED',
  NOT_SCREENED = 'NOT_SCREENED',
  NEGATIVE = 'NEGATIVE',
  POSITIVE = 'POSITIVE',
  UNKNOWN = 'UNKNOWN',
}

export enum ContrastStatus {
  NOT_REQUIRED = 'NOT_REQUIRED',
  PLANNED = 'PLANNED',
  ADMINISTERED = 'ADMINISTERED',
  NOT_ADMINISTERED = 'NOT_ADMINISTERED',
  CANCELLED = 'CANCELLED',
}

export enum AIStudyPriority {
  NOT_PROCESSED = 'NOT_PROCESSED',
  NORMAL = 'NORMAL',
  POTENTIALLY_URGENT = 'POTENTIALLY_URGENT',
  CRITICAL = 'CRITICAL',
  FAILED = 'FAILED',
}

export interface IPacsMetadata {
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
}

export interface IAssignment {
  userId: Types.ObjectId;
  role: AssignmentRole;
  assignedAt?: Date;
  assignedBy?: Types.ObjectId;
  notes?: string;
}

export interface IScheduling {
  scheduledDate?: Date;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  estimatedDurationMinutes?: number;
  modalityId?: Types.ObjectId;
  theatreOrRoom?: string;
  scheduledBy?: Types.ObjectId;
}

export interface IProcedureTracking {
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

export interface IPatientPreparation {
  instructions?: string;
  fastingRequired?: boolean;
  fastingHours?: number;
  hydrationRequired?: boolean;
  medicationInstructions?: string;
  preparationCompleted?: boolean;
  preparationNotes?: string;
}

export interface IContrastAdministration {
  status: ContrastStatus;
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

export interface IPregnancyScreening {
  status: PregnancyScreeningStatus;
  screenedAt?: Date;
  screenedBy?: Types.ObjectId;
  testType?: string;
  testResult?: string;
  notes?: string;
}

export interface IRadiationExposure {
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

export interface IReportVersion {
  version: number;
  findings: string;
  impression: string;
  radiologistNotes?: string;
  status: ReportStatus;
  createdBy: Types.ObjectId;
  createdAt: Date;
  signedAt?: Date;
}

export interface ICriticalResult {
  status: CriticalResultStatus;
  finding?: string;
  notifiedUserId?: Types.ObjectId;
  notifiedAt?: Date;
  acknowledgedAt?: Date;
  notificationMethod?: 'PHONE' | 'SMS' | 'EMAIL' | 'IN_APP';
  notificationNotes?: string;
}

export interface IAIAnalysis {
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

export interface IRadiologyReport {
  status: ReportStatus;
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
  criticalResult?: ICriticalResult;
  versions?: IReportVersion[];
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

  scheduling?: IScheduling;

  assignments?: IAssignment[];

  procedureTracking?: IProcedureTracking;

  patientPreparation?: IPatientPreparation;

  contrast?: IContrastAdministration;

  pregnancyScreening?: IPregnancyScreening;

  radiationExposure?: IRadiationExposure;

  pacsMetadata?: IPacsMetadata;

  report?: IRadiologyReport;

  findings?: string;

  impression?: string;

  radiologistNotes?: string;

  reportedAt?: Date;

  cancellationReason?: string;

  queuePosition?: number;

  queueStatus?: ExaminationQueueStatus;

  aiAnalysis?: IAIAnalysis;

  createdAt?: Date;

  updatedAt?: Date;
}

export interface IRadiologyOrderDocument
  extends IRadiologyOrder,
    Document {
  createdAt: Date;
  updatedAt: Date;
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

  scheduling?: {
    scheduledDate?: string | Date;
    scheduledStartTime?: string;
    scheduledEndTime?: string;
    estimatedDurationMinutes?: number;
    modalityId?: string;
    theatreOrRoom?: string;
  };

  patientPreparation?: IPatientPreparation;

  contrast?: IContrastAdministration;

  pregnancyScreening?: IPregnancyScreening;
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
  }>;
  patientPreparation?: IPatientPreparation;
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

export interface UpdateExaminationStatusInput {
  status: RadiologyOrderStatus;
  notes?: string;
}

export interface UpdateQueueInput {
  queuePosition?: number;
  queueStatus?: ExaminationQueueStatus;
}

export interface UpdateContrastInput {
  status: ContrastStatus;
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
  status: PregnancyScreeningStatus;
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
  criticalResult?: Partial<ICriticalResult>;
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
