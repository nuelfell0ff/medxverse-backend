import { Document, Types } from 'mongoose';

export enum LabTestCategory {
  HAEMATOLOGY = 'HAEMATOLOGY',
  BIOCHEMISTRY = 'BIOCHEMISTRY',
  MICROBIOLOGY = 'MICROBIOLOGY',
  PARASITOLOGY = 'PARASITOLOGY',
  IMMUNOLOGY = 'IMMUNOLOGY',
  HISTOPATHOLOGY = 'HISTOPATHOLOGY',
  OTHER = 'OTHER',
}

export enum LabRequestStatus {
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

export interface ILabParameter {
  name: string;
  unit?: string;
  referenceRange?: string; // e.g., "4.0 - 11.0 x10^9/L" or "70 - 99 mg/dL"
}

export interface ILabTestDocument extends Document {
  hospitalId: Types.ObjectId;
  code: string;
  name: string;
  category: LabTestCategory;
  description?: string;
  sampleType: string; // e.g., "Whole Blood", "Urine", "Serum", "Swab"
  parameters: ILabParameter[];
  price: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILabResultValue {
  parameterName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  isAbnormal?: boolean;
}

export interface ILabRequestItem {
  _id?: Types.ObjectId;
  testId: Types.ObjectId;
  testName: string;
  price: number;
  status: LabRequestStatus;
  results?: ILabResultValue[];
  remarks?: string;
}

export interface ILabRequestDocument extends Document {
  hospitalId: Types.ObjectId;
  requestNumber: string;
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  ipdAdmissionId?: Types.ObjectId;
  priority: LabPriority;
  status: LabRequestStatus;
  sampleCollectedAt?: Date;
  sampleCollectedBy?: Types.ObjectId;
  sampleTypeNotes?: string;
  items: ILabRequestItem[];
  totalAmount: number;
  notes?: string;
  performedBy?: Types.ObjectId;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// --- DTOs ---

export interface CreateLabTestDTO {
  code: string;
  name: string;
  category: LabTestCategory;
  description?: string;
  sampleType: string;
  parameters: ILabParameter[];
  price: number;
}

export interface UpdateLabTestDTO {
  name?: string;
  category?: LabTestCategory;
  description?: string;
  sampleType?: string;
  parameters?: ILabParameter[];
  price?: number;
  isActive?: boolean;
}

export interface CreateLabRequestDTO {
  patientId: string;
  doctorId: string;
  ipdAdmissionId?: string;
  priority?: LabPriority;
  testIds: string[];
  notes?: string;
}

export interface CollectSampleDTO {
  collectedBy: string;
  sampleTypeNotes?: string;
}

export interface SubmitTestResultsDTO {
  performedBy: string;
  testResults: {
    testId: string;
    results: ILabResultValue[];
    remarks?: string;
  }[];
}