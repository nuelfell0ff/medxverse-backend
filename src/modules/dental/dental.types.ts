import { Document, Types } from 'mongoose';

export enum ToothStatus {
  HEALTHY = 'HEALTHY',
  DECAYED = 'DECAYED',
  FILLED = 'FILLED',
  MISSING = 'MISSING',
  CROWNED = 'CROWNED',
  IMPLANT = 'IMPLANT',
  EXTRACTED = 'EXTRACTED',
  ROOT_CANAL_TREATED = 'ROOT_CANAL_TREATED',
  BRIDGE_ANCHOR = 'BRIDGE_ANCHOR',
}

export enum ToothSurface {
  MESIAL = 'MESIAL',
  DISTAL = 'DISTAL',
  OCCLUSAL = 'OCCLUSAL',
  INCISAL = 'INCISAL',
  FACIAL = 'FACIAL',
  BUCCAL = 'BUCCAL',
  LINGUAL = 'LINGUAL',
}

export enum DentalProcedureType {
  EXAMINATION = 'EXAMINATION',
  CLEANING_PROPHYLAXIS = 'CLEANING_PROPHYLAXIS',
  FILLING_RESTORATION = 'FILLING_RESTORATION',
  ROOT_CANAL_THERAPY = 'ROOT_CANAL_THERAPY',
  EXTRACTION = 'EXTRACTION',
  CROWN_BRIDGE = 'CROWN_BRIDGE',
  DENTAL_IMPLANT = 'DENTAL_IMPLANT',
  ORTHODONTIC_TREATMENT = 'ORTHODONTIC_TREATMENT',
  PERIODONTAL_SCALING = 'PERIODONTAL_SCALING',
  DENTAL_XRAY = 'DENTAL_XRAY',
  TEETH_WHITENING = 'TEETH_WHITENING',
}

export enum ProcedureStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface IToothRecord {
  toothNumber: number; // Universal numbering system (1-32) or FDI system (11-48)
  status: ToothStatus;
  affectedSurfaces?: ToothSurface[];
  notes?: string;
}

export interface IDentalChart {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  dentistId: Types.ObjectId;
  teeth: IToothRecord[];
  overallPeriodontalHealth?: string;
  notes?: string;
}

export interface IDentalChartDocument extends IDentalChart, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IDentalProcedure {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  dentistId: Types.ObjectId;
  procedureType: DentalProcedureType;
  toothNumber?: number;
  surfaces?: ToothSurface[];
  status: ProcedureStatus;
  cost?: number;
  performedAt?: Date;
  clinicalNotes?: string;
}

export interface IDentalProcedureDocument extends IDentalProcedure, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertDentalChartInput {
  hospitalId: string;
  patientId: string;
  dentistId: string;
  teeth: IToothRecord[];
  overallPeriodontalHealth?: string;
  notes?: string;
}

export interface CreateDentalProcedureInput {
  hospitalId: string;
  patientId: string;
  dentistId: string;
  procedureType: DentalProcedureType;
  toothNumber?: number;
  surfaces?: ToothSurface[];
  status?: ProcedureStatus;
  cost?: number;
  performedAt?: Date;
  clinicalNotes?: string;
}

export interface UpdateProcedureStatusInput {
  status: ProcedureStatus;
  clinicalNotes?: string;
  cost?: number;
}

export interface GetDentalProceduresQuery {
  page?: number;
  limit?: number;
  patientId?: string;
  dentistId?: string;
  procedureType?: DentalProcedureType;
  status?: ProcedureStatus;
  toothNumber?: number;
}