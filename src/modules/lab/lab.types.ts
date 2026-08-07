import { Document, Types } from 'mongoose';

export enum LabOrderStatus {
  PENDING = 'PENDING',
  SAMPLE_COLLECTED = 'SAMPLE_COLLECTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum LabPriority {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  STAT = 'STAT',
}

export enum ResultFlag {
  NORMAL = 'NORMAL',
  ABNORMAL = 'ABNORMAL',
  CRITICAL = 'CRITICAL',
}

export interface ILabResultField {
  parameterName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  flag: ResultFlag;
}

export interface ILabOrder {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  consultationId?: Types.ObjectId;
  testName: string;
  testCategory: string; // e.g., "Hematology", "Biochemistry", "Microbiology"
  priority: LabPriority;
  status: LabOrderStatus;
  sampleType?: string; // e.g., "Venous Blood", "Urine", "Swab"
  notes?: string;
  results: ILabResultField[];
  labTechnicianId?: Types.ObjectId;
  sampleCollectedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILabOrderDocument extends ILabOrder, Document {
  _id: Types.ObjectId;
}

export interface CreateLabOrderDTO {
  patientId: string;
  doctorId?: string;
  consultationId?: string;
  testName: string;
  testCategory: string;
  priority?: LabPriority;
  sampleType?: string;
  notes?: string;
}

export interface RecordLabResultsDTO {
  results: ILabResultField[];
  status?: LabOrderStatus;
  notes?: string;
}

export interface GetLabOrdersQueryDTO {
  patientId?: string;
  doctorId?: string;
  status?: LabOrderStatus;
  priority?: LabPriority;
  testCategory?: string;
  page?: string;
  limit?: string;
}