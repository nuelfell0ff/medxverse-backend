import { Document, Types } from 'mongoose';

export type ImagingType = 'X_RAY' | 'MRI' | 'CT_SCAN' | 'ULTRASOUND' | 'MAMMOGRAM';
export type RadiologyStatus = 'ORDERED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type Priority = 'ROUTINE' | 'URGENT' | 'EMERGENCY';

export interface IRadiologyRequest extends Document {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  requestedBy: Types.ObjectId;
  radiologistId?: Types.ObjectId;
  imagingType: ImagingType;
  bodyPart: string;
  clinicalIndication: string;
  priority: Priority;
  status: RadiologyStatus;
  findings?: string;
  impression?: string;
  imageUrls: string[];
  reportedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateImagingRequestDto {
  patientId: string;
  imagingType: ImagingType;
  bodyPart: string;
  clinicalIndication: string;
  priority: Priority;
}

export interface SubmitRadiologyReportDto {
  radiologistId: string;
  findings: string;
  impression: string;
  imageUrls?: string[];
}