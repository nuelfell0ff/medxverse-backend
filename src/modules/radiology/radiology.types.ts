import { Document, Types } from 'mongoose';

export enum ImagingModality {
  X_RAY = 'X_RAY',
  CT_SCAN = 'CT_SCAN',
  MRI = 'MRI',
  ULTRASOUND = 'ULTRASOUND',
  MAMMOGRAPHY = 'MAMMOGRAPHY',
  PET_SCAN = 'PET_SCAN',
  DEXA = 'DEXA',
  OTHER = 'OTHER',
}

export enum RadiologyOrderStatus {
  REQUESTED = 'REQUESTED',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REPORTED = 'REPORTED',
  CANCELLED = 'CANCELLED',
}

export enum PriorityLevel {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  STAT = 'STAT',
}

export interface IPacsMetadata {
  studyInstanceUid?: string;
  seriesInstanceUid?: string;
  imageCount?: number;
  dicomViewerUrl?: string;
  dicomFileKeys?: string[];
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
  pacsMetadata?: IPacsMetadata;
  findings?: string;
  impression?: string;
  radiologistNotes?: string;
  reportedAt?: Date;
  cancellationReason?: string;
}

export interface IRadiologyOrderDocument extends IRadiologyOrder, Document {
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
}

export interface UpdatePacsMetadataInput {
  studyInstanceUid?: string;
  seriesInstanceUid?: string;
  imageCount?: number;
  dicomViewerUrl?: string;
  dicomFileKeys?: string[];
}

export interface CompleteRadiologyReportInput {
  radiologistId: string;
  findings: string;
  impression: string;
  radiologistNotes?: string;
}

export interface GetRadiologyOrdersQuery {
  page?: number;
  limit?: number;
  status?: RadiologyOrderStatus;
  modality?: ImagingModality;
  patientId?: string;
  orderingDoctorId?: string;
  radiologistId?: string;
}