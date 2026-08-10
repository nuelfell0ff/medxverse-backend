import { Document, Types } from 'mongoose';

export enum TriagePriority {
  IMMEDIATE = 'IMMEDIATE', // Red
  VERY_URGENT = 'VERY_URGENT', // Orange
  URGENT = 'URGENT', // Yellow
  STANDARD = 'STANDARD', // Green
  NON_URGENT = 'NON_URGENT', // Blue
}

export enum ConsultationStatus {
  IN_QUEUE = 'IN_QUEUE',
  WITH_NURSE = 'WITH_NURSE',
  WAITING_FOR_DOCTOR = 'WAITING_FOR_DOCTOR',
  IN_CONSULTATION = 'IN_CONSULTATION',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface IVitalSigns {
  temperature?: number; // Celsius
  bloodPressureSystolic?: number; // mmHg
  bloodPressureDiastolic?: number; // mmHg
  pulseRate?: number; // bpm
  respiratoryRate?: number; // breaths/min
  oxygenSaturation?: number; // %
  height?: number; // cm
  weight?: number; // kg
  bmi?: number;
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
