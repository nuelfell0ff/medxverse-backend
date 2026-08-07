import { Document, Types } from 'mongoose';

export enum CareLevel {
  LEVEL_1_HIGH_DEPENDENCY = 'LEVEL_1_HIGH_DEPENDENCY',
  LEVEL_2_ICU = 'LEVEL_2_ICU',
  LEVEL_3_CRITICAL = 'LEVEL_3_CRITICAL',
}

export enum ICUCaseStatus {
  ADMITTED = 'ADMITTED',
  STABILIZED = 'STABILIZED',
  TRANSFERRED_OUT = 'TRANSFERRED_OUT',
  DISCHARGED = 'DISCHARGED',
  DECEASED = 'DECEASED',
}

export enum VentilatorMode {
  NONE = 'NONE',
  AC = 'AC',
  SIMV = 'SIMV',
  PSV = 'PSV',
  CPAP = 'CPAP',
  BIPAP = 'BIPAP',
  HIGH_FLOW_NASAL = 'HIGH_FLOW_NASAL',
}

export interface IVentilatorSettings {
  mode: VentilatorMode;
  fio2Pct?: number;
  peepCmH2O?: number;
  tidalVolumeMl?: number;
  respiratoryRate?: number;
  pressureSupportCmH2O?: number;
  isIntubated?: boolean;
}

export interface IICUVitals {
  heartRateBpm?: number;
  systolicBpMmHg?: number;
  diastolicBpMmHg?: number;
  meanArterialPressureMmHg?: number;
  oxygenSaturationPct?: number;
  temperatureCelsius?: number;
  centralVenousPressureMmHg?: number;
  intracranialPressureMmHg?: number;
  glasgowComaScale?: number;
}

export interface IICUAdmission {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  bedNumber: string;
  careLevel: CareLevel;
  primaryDiagnosis: string;
  attendingPhysicianId?: Types.ObjectId;
  admittedById: Types.ObjectId;
  vitals?: IICUVitals;
  ventilatorSettings?: IVentilatorSettings;
  status: ICUCaseStatus;
  transferredToWardId?: Types.ObjectId;
  dispositionNotes?: string;
  admittedAt: Date;
  dischargedAt?: Date;
}

export interface IICUAdmissionDocument extends IICUAdmission, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateICUAdmissionInput {
  hospitalId: string;
  patientId: string;
  bedNumber: string;
  careLevel: CareLevel;
  primaryDiagnosis: string;
  attendingPhysicianId?: string;
  admittedById: string;
  vitals?: IICUVitals;
  ventilatorSettings?: IVentilatorSettings;
}

export interface UpdateICUVitalsInput {
  vitals: IICUVitals;
}

export interface UpdateVentilatorSettingsInput {
  ventilatorSettings: IVentilatorSettings;
}

export interface UpdateICUStatusInput {
  status: ICUCaseStatus;
  dispositionNotes?: string;
  transferredToWardId?: string;
  dischargedAt?: Date;
}

export interface GetICUAdmissionsQuery {
  page?: number;
  limit?: number;
  status?: ICUCaseStatus;
  careLevel?: CareLevel;
  patientId?: string;
  bedNumber?: string;
}