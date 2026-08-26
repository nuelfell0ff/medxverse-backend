import { Document, Types } from 'mongoose';

export enum TriagePriority {
  IMMEDIATE = 'IMMEDIATE',
  VERY_URGENT = 'VERY_URGENT',
  URGENT = 'URGENT',
  STANDARD = 'STANDARD',
  NON_URGENT = 'NON_URGENT',
}

export enum ConsultationStatus {
  IN_QUEUE = 'IN_QUEUE',
  WITH_NURSE = 'WITH_NURSE',
  WAITING_FOR_DOCTOR = 'WAITING_FOR_DOCTOR',
  IN_CONSULTATION = 'IN_CONSULTATION',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum BillingCaptureStatus {
  NOT_ATTEMPTED = 'NOT_ATTEMPTED',
  CAPTURED = 'CAPTURED',
  FAILED = 'FAILED',
}

export const OUTPATIENT_CONSULTATION_SERVICE_CODE = 'OUTPATIENT_CONSULTATION';

export interface IVitalSigns {
  temperature?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  pulseRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  height?: number;
  weight?: number;
  bmi?: number;
}

export interface IOutpatientBilling {
  status: BillingCaptureStatus;
  catalogueItemId?: Types.ObjectId;
  cataloguePlanName?: string;
  cataloguePrice?: number;
  catalogueVersion?: number;
  catalogueCurrency?: string;
  chargeId?: Types.ObjectId;
  serviceCode?: string;
  error?: string;
  capturedAt?: Date;
}

export interface IOutpatient {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  doctorId?: Types.ObjectId;
  departmentId?: Types.ObjectId;
  triagePriority: TriagePriority;
  status: ConsultationStatus;
  chiefComplaint: string;
  vitalSigns?: IVitalSigns;
  nursingNotes?: string;
  consultationNotes?: string;
  diagnoses?: string[];
  queuedAt: Date;
  consultationStartedAt?: Date;
  consultationEndedAt?: Date;
  pricingCatalogueItemId?: Types.ObjectId;
  pricingCataloguePlanName?: string;
  pricingCataloguePrice?: number;
  pricingCatalogueVersion?: number;
  pricingCatalogueCurrency?: string;
  billing?: IOutpatientBilling;
}

export interface IOutpatientDocument extends IOutpatient, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOutpatientInput {
  hospitalId: string;
  patientId: string;
  doctorId?: string;
  departmentId?: string;
  triagePriority?: TriagePriority;
  chiefComplaint: string;
  pricingCatalogueItemId?: string;
}

export interface UpdateVitalsInput {
  vitalSigns: IVitalSigns;
  nursingNotes?: string;
}

export interface CompleteConsultationInput {
  consultationNotes: string;
  diagnoses?: string[];
}

export interface GetOutpatientQuery {
  page?: number;
  limit?: number;
  status?: ConsultationStatus;
  doctorId?: string;
  triagePriority?: TriagePriority;
}
