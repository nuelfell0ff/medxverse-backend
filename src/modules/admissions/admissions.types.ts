import { Document, Types } from 'mongoose';

export enum BedType {
  GENERAL = 'GENERAL',
  SEMI_PRIVATE = 'SEMI_PRIVATE',
  PRIVATE = 'PRIVATE',
  ICU = 'ICU',
  HDU = 'HDU',
  ISOLATION = 'ISOLATION',
}

export enum BedStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  MAINTENANCE = 'MAINTENANCE',
  RESERVED = 'RESERVED',
}

export enum AdmissionStatus {
  ADMITTED = 'ADMITTED',
  TRANSFERRED = 'TRANSFERRED',
  DISCHARGED = 'DISCHARGED',
  CANCELLED = 'CANCELLED',
}

export interface ITransferLog {
  fromWardId: string;
  fromBedNumber: string;
  toWardId: string;
  toBedNumber: string;
  transferredAt: Date;
  transferredBy: Types.ObjectId;
  reason?: string;
}

export interface IInpatientAdmission {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  admittingDoctorId: Types.ObjectId;
  wardId: string;
  bedNumber: string;
  bedType: BedType;
  admissionReason: string;
  status: AdmissionStatus;
  admittedAt: Date;
  dischargedAt?: Date;
  dischargeSummary?: string;
  transferHistory?: ITransferLog[];
}

export interface IInpatientAdmissionDocument extends IInpatientAdmission, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAdmissionInput {
  hospitalId: string;
  patientId: string;
  admittingDoctorId: string;
  wardId: string;
  bedNumber: string;
  bedType: BedType;
  admissionReason: string;
}

export interface TransferBedInput {
  toWardId: string;
  toBedNumber: string;
  transferredBy: string;
  reason?: string;
}

export interface DischargePatientInput {
  dischargeSummary: string;
}

export interface GetAdmissionsQuery {
  page?: number;
  limit?: number;
  status?: AdmissionStatus;
  wardId?: string;
  patientId?: string;
}