import { Document, Types } from 'mongoose';

export enum IpdStatus {
  ADMITTED = 'ADMITTED',
  DISCHARGED = 'DISCHARGED',
  TRANSFERRED = 'TRANSFERRED',
  CANCELLED = 'CANCELLED',
}

export enum DischargeStatus {
  RECOVERED = 'RECOVERED',
  IMPROVED = 'IMPROVED',
  REFERRED = 'REFERRED',
  AGAINST_MEDICAL_ADVICE = 'AGAINST_MEDICAL_ADVICE',
  DECEASED = 'DECEASED',
}

export interface IProgressNote {
  note: string;
  recordedBy?: string; // Doctor or Nurse name/ID
  createdAt: Date;
}

export interface IIpdAdmission {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId; // Attending Doctor from Staff module
  admissionDate: Date;
  dischargeDate?: Date;
  status: IpdStatus;
  
  // Bed / Ward allocation
  ward: string; // e.g. "Male Medical Ward"
  roomNumber?: string;
  bedNumber: string;

  admissionReason: string;
  initialDiagnosis?: string;

  // Discharge Information
  dischargeSummary?: string;
  dischargeStatus?: DischargeStatus;

  progressNotes?: IProgressNote[];

  createdAt: Date;
  updatedAt: Date;
}

export interface IIpdDocument extends IIpdAdmission, Document {
  _id: Types.ObjectId;
}

export interface CreateIpdAdmissionDTO {
  patientId: string;
  doctorId: string;
  ward: string;
  roomNumber?: string;
  bedNumber: string;
  admissionReason: string;
  initialDiagnosis?: string;
  admissionDate?: string;
}

export interface DischargePatientDTO {
  dischargeSummary: string;
  dischargeStatus: DischargeStatus;
  dischargeDate?: string;
}

export interface AddProgressNoteDTO {
  note: string;
  recordedBy?: string;
}

export interface UpdateIpdAdmissionDTO {
  doctorId?: string;
  ward?: string;
  roomNumber?: string;
  bedNumber?: string;
  admissionReason?: string;
  initialDiagnosis?: string;
}