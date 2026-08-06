import { Document, Types } from 'mongoose';

export enum OpdStatus {
  SCHEDULED = 'SCHEDULED',
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface IVitals {
  bloodPressure?: string; // e.g. "120/80"
  pulseRate?: number; // bpm
  temperature?: number; // °C
  respiratoryRate?: number; // breaths/min
  weight?: number; // kg
  height?: number; // cm
  spo2?: number; // %
}

export interface IOpdEncounter {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId; // References Staff model (DOCTOR role)
  encounterDate: Date;
  status: OpdStatus;
  reasonForVisit: string;
  vitals?: IVitals;
  symptoms?: string[];
  diagnosis?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOpdDocument extends IOpdEncounter, Document {
  _id: Types.ObjectId;
}

export interface CreateOpdDTO {
  patientId: string;
  doctorId: string;
  encounterDate?: string;
  reasonForVisit: string;
  symptoms?: string[];
}

export interface RecordVitalsDTO {
  vitals: IVitals;
}

export interface UpdateOpdDTO {
  doctorId?: string;
  status?: OpdStatus;
  reasonForVisit?: string;
  symptoms?: string[];
  diagnosis?: string;
  notes?: string;
  vitals?: IVitals;
}