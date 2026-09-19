import { Types } from 'mongoose';

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

export enum ICUDeviceType {
  MONITOR = 'MONITOR',
  VENTILATOR = 'VENTILATOR',
  INFUSION_PUMP = 'INFUSION_PUMP',
  OTHER = 'OTHER',
}

export enum DeviceProtocol {
  HL7 = 'HL7',
  IEEE_11073 = 'IEEE_11073',
  VENDOR_API = 'VENDOR_API',
  FHIR = 'FHIR',
  MANUAL = 'MANUAL',
}

export enum ReadingQuality {
  VALID = 'VALID',
  SUSPECT = 'SUSPECT',
  INVALID = 'INVALID',
  DEVICE_OFFLINE = 'DEVICE_OFFLINE',
}

export enum FlowEntrySource {
  DEVICE = 'DEVICE',
  MANUAL = 'MANUAL',
  DERIVED = 'DERIVED',
}

export enum ICUScoreType {
  SOFA = 'SOFA',
  APACHE_II = 'APACHE_II',
}

export enum ICUScoreStatus {
  COMPLETE = 'COMPLETE',
  PARTIAL = 'PARTIAL',
}

export interface IVentilatorSettings {
  mode: VentilatorMode;
  fio2Pct?: number;
  peepCmH2O?: number;
  tidalVolumeMl?: number;
  respiratoryRate?: number;
  pressureSupportCmH2O?: number;
  inspiratoryPressureCmH2O?: number;
  minuteVentilationL?: number;
  isIntubated?: boolean;
}

export interface IICUVitals {
  heartRateBpm?: number;
  systolicBpMmHg?: number;
  diastolicBpMmHg?: number;
  meanArterialPressureMmHg?: number;
  respiratoryRateBpm?: number;
  oxygenSaturationPct?: number;
  temperatureCelsius?: number;
  centralVenousPressureMmHg?: number;
  intracranialPressureMmHg?: number;
  glasgowComaScale?: number;
}

export interface IICUAdmission {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  wardId: Types.ObjectId;
  bedNumber: string;
  careLevel: CareLevel;
  primaryDiagnosis: string;
  admissionReason: string;
  attendingPhysicianId?: Types.ObjectId;
  admittedById: Types.ObjectId;
  vitals?: IICUVitals;
  ventilatorSettings?: IVentilatorSettings;
  status: ICUCaseStatus;
  transferredToWardId?: Types.ObjectId;
  dispositionNotes?: string;
  admittedAt: Date;
  dischargedAt?: Date;
  sourceSurgeryCaseId?: Types.ObjectId;
  encounterId?: Types.ObjectId;
}

export interface IICUAdmissionDocument extends IICUAdmission {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateICUAdmissionInput {
  patientId: string;
  wardId: string;
  bedNumber: string;
  careLevel: CareLevel;
  primaryDiagnosis: string;
  admissionReason: string;
  attendingPhysicianId?: string;
  admittedById: string;
  vitals?: IICUVitals;
  ventilatorSettings?: IVentilatorSettings;
  sourceSurgeryCaseId?: string;
  encounterId?: string;
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
  wardId?: string;
  bedNumber?: string;
}

export interface IDeviceMeasurement {
  parameter: string;
  value: number | string | boolean;
  unit?: string;
  referenceCode?: string;
}

export interface IDeviceReading {
  hospitalId: Types.ObjectId;
  admissionId: Types.ObjectId;
  patientId: Types.ObjectId;
  deviceId: string;
  deviceType: ICUDeviceType;
  manufacturer?: string;
  model?: string;
  protocol: DeviceProtocol;
  measurements: IDeviceMeasurement[];
  quality: ReadingQuality;
  recordedAt: Date;
  receivedAt: Date;
  sourceSequence?: string;
  rawPayloadHash?: string;
  metadata?: Record<string, unknown>;
}

export interface IDeviceReadingDocument extends IDeviceReading {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IngestDeviceReadingInput {
  admissionId: string;
  deviceId: string;
  deviceType: ICUDeviceType;
  protocol?: DeviceProtocol;
  manufacturer?: string;
  model?: string;
  recordedAt?: string | Date;
  sourceSequence?: string;
  measurements?: IDeviceMeasurement[];
  payload?: Record<string, unknown> | string;
  quality?: ReadingQuality;
  metadata?: Record<string, unknown>;
}

export interface NormalizedDevicePayload {
  deviceId: string;
  deviceType: ICUDeviceType;
  protocol: DeviceProtocol;
  manufacturer?: string;
  model?: string;
  recordedAt: Date;
  sourceSequence?: string;
  measurements: IDeviceMeasurement[];
  quality: ReadingQuality;
  rawPayloadHash?: string;
  metadata?: Record<string, unknown>;
}

export interface IFlowsheetEntry {
  hospitalId: Types.ObjectId;
  admissionId: Types.ObjectId;
  patientId: Types.ObjectId;
  recordedAt: Date;
  category: string;
  parameter: string;
  value: number | string | boolean;
  unit?: string;
  source: FlowEntrySource;
  sourceDeviceReadingId?: Types.ObjectId;
  enteredById?: Types.ObjectId;
  reviewedById?: Types.ObjectId;
  reviewedAt?: Date;
  annotation?: string;
  status: 'PENDING_REVIEW' | 'CONFIRMED' | 'AMENDED';
}

export interface IFlowsheetEntryDocument extends IFlowsheetEntry {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertFlowsheetEntryInput {
  admissionId: string;
  recordedAt: string | Date;
  category: string;
  parameter: string;
  value: number | string | boolean;
  unit?: string;
  source?: FlowEntrySource;
  sourceDeviceReadingId?: string;
  annotation?: string;
}

export interface ICUScoreComponent {
  name: string;
  value?: number;
  points?: number;
  unit?: string;
  source?: string;
  missing?: boolean;
}

export interface IICUScore {
  hospitalId: Types.ObjectId;
  admissionId: Types.ObjectId;
  patientId: Types.ObjectId;
  scoreType: ICUScoreType;
  score: number;
  status: ICUScoreStatus;
  calculatedAt: Date;
  windowStart?: Date;
  windowEnd?: Date;
  components: ICUScoreComponent[];
  inputs: Record<string, unknown>;
  calculationVersion: string;
}

export interface IICUScoreDocument extends IICUScore {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RecalculateScoresInput {
  admissionId: string;
  calculatedAt?: string | Date;
  windowStart?: string | Date;
  windowEnd?: string | Date;
  labs?: Record<string, number | undefined>;
  clinical?: Record<string, number | undefined>;
}

export interface IFamilyCommunicationLog {
  hospitalId: Types.ObjectId;
  admissionId: Types.ObjectId;
  patientId: Types.ObjectId;
  communicatedAt: Date;
  communicatedById: Types.ObjectId;
  contactName: string;
  relationship?: string;
  contactMethod: 'IN_PERSON' | 'PHONE' | 'VIDEO' | 'OTHER';
  topics: string[];
  summary: string;
  questionsOrConcerns?: string;
  followUpRequired: boolean;
  followUpPlan?: string;
}

export interface IFamilyCommunicationLogDocument extends IFamilyCommunicationLog {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFamilyCommunicationInput {
  admissionId: string;
  contactName: string;
  relationship?: string;
  contactMethod: IFamilyCommunicationLog['contactMethod'];
  topics: string[];
  summary: string;
  questionsOrConcerns?: string;
  followUpRequired?: boolean;
  followUpPlan?: string;
}

export interface ICUDashboardData {
  admission: IICUAdmissionDocument;
  latestReadings: IDeviceReadingDocument[];
  recentFlowsheet: IFlowsheetEntryDocument[];
  latestScores: IICUScoreDocument[];
  familyCommunications: IFamilyCommunicationLogDocument[];
}
