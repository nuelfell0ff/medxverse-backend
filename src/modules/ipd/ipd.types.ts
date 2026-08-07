import { Document, Types } from 'mongoose';

export enum WardType {
  GENERAL = 'GENERAL',
  PRIVATE = 'PRIVATE',
  ICU = 'ICU',
  ISOLATION = 'ISOLATION',
  PEDIATRIC = 'PEDIATRIC',
  MATERNITY = 'MATERNITY',
}

export enum BedStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  CLEANING = 'CLEANING',
  MAINTENANCE = 'MAINTENANCE',
}

export enum AdmissionStatus {
  ADMITTED = 'ADMITTED',
  DISCHARGED = 'DISCHARGED',
  TRANSFERRED = 'TRANSFERRED',
  CANCELLED = 'CANCELLED',
}

export interface IWard {
  hospitalId: Types.ObjectId;
  name: string;
  type: WardType;
  capacity: number;
  description?: string;
  isOperational: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IWardDocument extends IWard, Document {}

export interface IBed {
  hospitalId: Types.ObjectId;
  wardId: Types.ObjectId;
  bedNumber: string;
  status: BedStatus;
  dailyRate: number;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IBedDocument extends IBed, Document {}

export interface IDailyProgressNote {
  note: string;
  recordedBy: Types.ObjectId;
  createdAt: Date;
}

export interface IInpatientAdmission {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  doctorInChargeId: Types.ObjectId;
  wardId: Types.ObjectId;
  bedId: Types.ObjectId;
  admissionNumber: string;
  admissionDate: Date;
  dischargeDate?: Date;
  status: AdmissionStatus;
  admissionReason: string;
  diagnosis?: string;
  estimatedDischargeDate?: Date;
  progressNotes: IDailyProgressNote[];
  dischargeSummary?: string;
  admittedBy: Types.ObjectId;
  dischargedBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IInpatientAdmissionDocument extends IInpatientAdmission, Document {}

export interface ICreateWardDTO {
  name: string;
  type: WardType;
  capacity: number;
  description?: string;
}

export interface ICreateBedDTO {
  wardId: string;
  bedNumber: string;
  dailyRate: number;
  notes?: string;
}

export interface IAdmitPatientDTO {
  patientId: string;
  doctorInChargeId: string;
  wardId: string;
  bedId: string;
  admissionReason: string;
  diagnosis?: string;
  estimatedDischargeDate?: Date;
}

export interface ITransferBedDTO {
  newWardId: string;
  newBedId: string;
  reason?: string;
}

export interface IDischargePatientDTO {
  dischargeSummary: string;
}

export interface IIpdQueryFilters {
  patientId?: string;
  wardId?: string;
  doctorInChargeId?: string;
  status?: AdmissionStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}