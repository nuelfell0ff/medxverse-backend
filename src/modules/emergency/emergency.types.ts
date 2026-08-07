import { Document, Types } from 'mongoose';

export enum TriageCategory {
  RED_IMMEDIATE = 'RED_IMMEDIATE',
  YELLOW_URGENT = 'YELLOW_URGENT',
  GREEN_DELAYED = 'GREEN_DELAYED',
  BLACK_EXPECTANT = 'BLACK_EXPECTANT',
}

export enum EmergencyStatus {
  TRIAGED = 'TRIAGED',
  IN_TREATMENT = 'IN_TREATMENT',
  STABILIZED = 'STABILIZED',
  ADMITTED = 'ADMITTED',
  DISCHARGED = 'DISCHARGED',
  TRANSFERRED = 'TRANSFERRED',
  DECEASED = 'DECEASED',
}

export enum ArrivalMode {
  AMBULANCE = 'AMBULANCE',
  WALK_IN = 'WALK_IN',
  POLICE = 'POLICE',
  REFERRAL = 'REFERRAL',
  OTHER = 'OTHER',
}

export enum TraumaType {
  NONE = 'NONE',
  BLUNT = 'BLUNT',
  PENETRATING = 'PENETRATING',
  THERMAL = 'THERMAL',
  CHEMICAL = 'CHEMICAL',
  MULTI_SYSTEM = 'MULTI_SYSTEM',
}

export interface ITriageVitals {
  heartRateBpm?: number;
  bloodPressure?: string;
  respiratoryRateBpm?: number;
  oxygenSaturationPct?: number;
  temperatureCelsius?: number;
  glasgowComaScale?: number;
  painScale?: number;
}

export interface IEmergencyCase {
  hospitalId: Types.ObjectId;
  patientId?: Types.ObjectId;
  isUnidentified: boolean;
  temporaryIdentifier?: string;
  chiefComplaint: string;
  arrivalMode: ArrivalMode;
  triageCategory: TriageCategory;
  triageVitals?: ITriageVitals;
  assignedBay?: string;
  traumaType: TraumaType;
  attendingDoctorId?: Types.ObjectId;
  triagedById: Types.ObjectId;
  status: EmergencyStatus;
  dispositionNotes?: string;
  admittedToWardId?: Types.ObjectId;
  transferredToFacility?: string;
}

export interface IEmergencyCaseDocument extends IEmergencyCase, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmergencyCaseInput {
  hospitalId: string;
  patientId?: string;
  isUnidentified?: boolean;
  temporaryIdentifier?: string;
  chiefComplaint: string;
  arrivalMode: ArrivalMode;
  triageCategory: TriageCategory;
  triageVitals?: ITriageVitals;
  assignedBay?: string;
  traumaType?: TraumaType;
  attendingDoctorId?: string;
  triagedById: string;
}

export interface UpdateTriageInput {
  triageCategory: TriageCategory;
  triageVitals?: ITriageVitals;
  assignedBay?: string;
  attendingDoctorId?: string;
}

export interface UpdateEmergencyStatusInput {
  status: EmergencyStatus;
  dispositionNotes?: string;
  admittedToWardId?: string;
  transferredToFacility?: string;
}

export interface GetEmergencyCasesQuery {
  page?: number;
  limit?: number;
  status?: EmergencyStatus;
  triageCategory?: TriageCategory;
  traumaType?: TraumaType;
  patientId?: string;
  isUnidentified?: boolean;
}