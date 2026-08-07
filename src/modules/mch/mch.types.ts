import { Document, Types } from 'mongoose';

export enum MchCareType {
  ANTENATAL = 'ANTENATAL',
  POSTNATAL = 'POSTNATAL',
  CHILD_HEALTH = 'CHILD_HEALTH',
}

export enum PregnancyStatus {
  ACTIVE = 'ACTIVE',
  DELIVERED = 'DELIVERED',
  TERMINATED = 'TERMINATED',
}

export enum DeliveryType {
  SPONTANEOUS_VAGINAL = 'SPONTANEOUS_VAGINAL',
  ASSISTED_VAGINAL = 'ASSISTED_VAGINAL',
  CESAREAN_SECTION = 'CESAREAN_SECTION',
  FORCEPS = 'FORCEPS',
  VACUUM = 'VACUUM',
}

export enum DeliveryOutcome {
  LIVE_BIRTH = 'LIVE_BIRTH',
  STILL_BIRTH = 'STILL_BIRTH',
  NEONATAL_DEATH = 'NEONATAL_DEATH',
}

export interface IAncVisit {
  visitDate: Date;
  gestationalAgeWeeks: number;
  weightKg?: number;
  bloodPressure?: string;
  fundalHeightCm?: number;
  fetalHeartRateBpm?: number;
  fetalPosition?: string;
  urineProtein?: string;
  urineSugar?: string;
  hemoglobinGdl?: number;
  notes?: string;
  attendingStaffId: Types.ObjectId;
}

export interface IPncVisit {
  visitDate: Date;
  daysPostpartum: number;
  motherCondition?: string;
  infantCondition?: string;
  bloodPressure?: string;
  temperatureCelsius?: number;
  lochiaDescription?: string;
  breastfeedingStatus?: string;
  notes?: string;
  attendingStaffId: Types.ObjectId;
}

export interface IImmunizationRecord {
  vaccineName: string;
  doseNumber: number;
  administeredAt: Date;
  administeredBy: Types.ObjectId;
  batchNumber?: string;
  nextDueDate?: Date;
  notes?: string;
}

export interface IDeliveryRecord {
  deliveryDate: Date;
  deliveryType: DeliveryType;
  outcome: DeliveryOutcome;
  birthWeightKg?: number;
  apgarScore1Min?: number;
  apgarScore5Min?: number;
  infantGender?: 'MALE' | 'FEMALE' | 'AMBIGUOUS';
  complications?: string;
  deliveredBy: Types.ObjectId;
  notes?: string;
}

export interface IMchRecord {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  careType: MchCareType;
  gravida?: number;
  para?: number;
  estimatedDeliveryDate?: Date;
  lastMenstrualPeriod?: Date;
  pregnancyStatus?: PregnancyStatus;
  ancVisits?: IAncVisit[];
  pncVisits?: IPncVisit[];
  immunizations?: IImmunizationRecord[];
  deliveryRecord?: IDeliveryRecord;
  isActive: boolean;
}

export interface IMchRecordDocument extends IMchRecord, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMchRecordInput {
  hospitalId: string;
  patientId: string;
  careType: MchCareType;
  gravida?: number;
  para?: number;
  estimatedDeliveryDate?: Date;
  lastMenstrualPeriod?: Date;
}

export interface AddAncVisitInput {
  gestationalAgeWeeks: number;
  weightKg?: number;
  bloodPressure?: string;
  fundalHeightCm?: number;
  fetalHeartRateBpm?: number;
  fetalPosition?: string;
  urineProtein?: string;
  urineSugar?: string;
  hemoglobinGdl?: number;
  notes?: string;
  attendingStaffId: string;
}

export interface RecordDeliveryInput {
  deliveryDate: Date;
  deliveryType: DeliveryType;
  outcome: DeliveryOutcome;
  birthWeightKg?: number;
  apgarScore1Min?: number;
  apgarScore5Min?: number;
  infantGender?: 'MALE' | 'FEMALE' | 'AMBIGUOUS';
  complications?: string;
  deliveredBy: string;
  notes?: string;
}

export interface AddImmunizationInput {
  vaccineName: string;
  doseNumber: number;
  administeredBy: string;
  batchNumber?: string;
  nextDueDate?: Date;
  notes?: string;
}

export interface GetMchRecordsQuery {
  page?: number;
  limit?: number;
  careType?: MchCareType;
  patientId?: string;
  pregnancyStatus?: PregnancyStatus;
}