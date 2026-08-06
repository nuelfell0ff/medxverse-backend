import { Document, Types } from 'mongoose';

export type OPDVisitStatus =
  | 'QUEUED'
  | 'TRIAGED'
  | 'IN_CONSULTATION'
  | 'COMPLETED'
  | 'CANCELLED';

export type PriorityLevel = 'ROUTINE' | 'URGENT' | 'EMERGENCY';

export interface IVitals {
  temperature?: number; // in Celsius
  bloodPressureSystolic?: number; // mmHg
  bloodPressureDiastolic?: number; // mmHg
  pulseRate?: number; // bpm
  respiratoryRate?: number; // breaths/min
  oxygenSaturation?: number; // % SpO2
  weight?: number; // kg
  height?: number; // cm
  bmi?: number;
  recordedBy?: Types.ObjectId;
  recordedAt?: Date;
}

export interface IDiagnosis {
  code?: string; // ICD-10 code
  description: string;
  type: 'PRIMARY' | 'SECONDARY';
}

export interface IPrescriptionItem {
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  dispensed?: boolean;
}

export interface ILabOrderRequest {
  testName: string;
  notes?: string;
  status?: 'PENDING' | 'COMPLETED';
}

export interface IOPDVisit {
  patientId: Types.ObjectId;
  doctorId?: Types.ObjectId;
  organizationId: Types.ObjectId;
  visitNumber: string;
  status: OPDVisitStatus;
  priority: PriorityLevel;
  chiefComplaint: string;
  vitals?: IVitals;
  clinicalNotes?: string;
  diagnoses?: IDiagnosis[];
  prescriptions?: IPrescriptionItem[];
  labOrders?: ILabOrderRequest[];
  consultationStartTime?: Date;
  consultationEndTime?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IOPDVisitDocument extends IOPDVisit, Document {
  _id: Types.ObjectId;
}

export interface CreateOPDVisitDto {
  patientId: string;
  doctorId?: string;
  priority?: PriorityLevel;
  chiefComplaint: string;
}

export interface RecordVitalsDto {
  temperature?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  pulseRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
}

export interface CompleteConsultationDto {
  clinicalNotes: string;
  diagnoses?: IDiagnosis[];
  prescriptions?: IPrescriptionItem[];
  labOrders?: ILabOrderRequest[];
}

export interface OPDQueryFilters {
  doctorId?: string;
  status?: OPDVisitStatus;
  priority?: PriorityLevel;
  date?: string;
  search?: string;
  page?: number;
  limit?: number;
}