import { Document, Types } from 'mongoose';

export enum SurgeryStatus {
  SCHEDULED = 'SCHEDULED',
  PRE_OP_PREPARATION = 'PRE_OP_PREPARATION',
  IN_PROGRESS = 'IN_PROGRESS',
  RECOVERY = 'RECOVERY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  POSTPONED = 'POSTPONED',
}

export enum UrgencyLevel {
  ELECTIVE = 'ELECTIVE',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY',
}

export enum AnesthesiaType {
  GENERAL = 'GENERAL',
  REGIONAL = 'REGIONAL',
  LOCAL = 'LOCAL',
  SPINAL = 'SPINAL',
  EPIDURAL = 'EPIDURAL',
  SEDATION = 'SEDATION',
  COMBINED = 'COMBINED',
}

export enum SurgicalRole {
  PRIMARY_SURGEON = 'PRIMARY_SURGEON',
  ASSISTING_SURGEON = 'ASSISTING_SURGEON',
  ANAESTHETIST = 'ANAESTHETIST',
  SCRUB_NURSE = 'SCRUB_NURSE',
  CIRCULATING_NURSE = 'CIRCULATING_NURSE',
  THEATRE_TECHNICIAN = 'THEATRE_TECHNICIAN',
}

export enum ASAClassification {
  ASA_1 = 'ASA_1',
  ASA_2 = 'ASA_2',
  ASA_3 = 'ASA_3',
  ASA_4 = 'ASA_4',
  ASA_5 = 'ASA_5',
  ASA_6 = 'ASA_6',
  ASA_E = 'ASA_E',
}

export enum SterilizationStatus {
  STERILE = 'STERILE',
  PENDING = 'PENDING',
  EXPIRED = 'EXPIRED',
}

export interface ISurgicalTeamMember {
  userId: Types.ObjectId;
  role: SurgicalRole;
  credentialVerified?: boolean;
  notes?: string;
  [key: string]: any;
}

export interface IPreOpAssessment {
  asaClassification?: ASAClassification;
  mallampatiScore?: 'CLASS_I' | 'CLASS_II' | 'CLASS_III' | 'CLASS_IV';
  vteRiskScore?: string;
  infectionScreeningNotes?: string;
  pregnancyStatus?: 'NOT_APPLICABLE' | 'NEGATIVE' | 'POSITIVE';
  preOpVitals?: {
    bpSystolic?: number;
    bpDiastolic?: number;
    heartRate?: number;
    tempCelsius?: number;
    spO2?: number;
    [key: string]: any;
  };
  clearedForSurgery?: boolean;
  clearedAt?: Date;
  clearedBy?: Types.ObjectId;
  [key: string]: any;
}

export interface ISurgicalConsent {
  procedureConsent: boolean;
  anesthesiaConsent: boolean;
  bloodTransfusionConsent: boolean;
  highRiskConsent?: boolean;
  signedByPatient: boolean;
  witnessName?: string;
  digitalSignatureUrl?: string;
  signedAt?: Date;
  [key: string]: any;
}

export interface IEquipmentItem {
  itemName: string;
  sterileStatus: SterilizationStatus;
  maintenanceOk: boolean;
  notes?: string;
  [key: string]: any;
}

export interface IConsumableItem {
  itemName: string;
  quantityUsed: number;
  unitCost?: number;
  lotNumber?: string;
  [key: string]: any;
}

export interface IWHOSignIn {
  completed: boolean;
  completedAt?: Date;
  completedBy?: Types.ObjectId;
  patientIdentityConfirmed?: boolean;
  siteMarked?: boolean;
  consentVerified?: boolean;
  pulseOximeterOn?: boolean;
  allergyKnown?: boolean;
  airwayRisk?: boolean;
  bloodLossRiskOver500ml?: boolean;
  [key: string]: any;
}

export interface IWHOTimeOut {
  completed: boolean;
  completedAt?: Date;
  completedBy?: Types.ObjectId;
  teamIntroduced?: boolean;
  confirmPatientSiteProcedure?: boolean;
  antibioticProphylaxisGiven?: boolean;
  imagingDisplayed?: boolean;
  criticalConcernsSurgeon?: string;
  criticalConcernsAnaesthetist?: string;
  criticalConcernsNursing?: string;
  [key: string]: any;
}

export interface IWHOSignOut {
  completed: boolean;
  completedAt?: Date;
  completedBy?: Types.ObjectId;
  procedureRecorded?: string;
  countsCorrect?: boolean;
  specimenLabeled?: boolean;
  equipmentIssuesNoted?: string;
  postOpRecoveryPlan?: string;
  [key: string]: any;
}

export interface IWHOChecklist {
  signIn: IWHOSignIn;
  timeOut: IWHOTimeOut;
  signOut: IWHOSignOut;
  [key: string]: any;
}

export interface IIntraopVitalsLog {
  timestamp: Date;
  bpSystolic?: number;
  bpDiastolic?: number;
  heartRate?: number;
  spO2?: number;
  respRate?: number;
  tempCelsius?: number;
  etCO2?: number;
  ecgRhythm?: string;
  notes?: string;
  [key: string]: any;
}

export interface IIntraopDocumentation {
  incisionTime?: Date;
  closureTime?: Date;
  operativeDiagnosis?: string;
  postOperativeDiagnosis?: string;
  surgicalFindings?: string;
  techniqueNotes?: string;
  eblMl?: number;
  fluidsAdministeredMl?: number;
  bloodProductsAdministered?: string;
  drainsInserted?: string;
  implantsUsed?: string;
  specimensCollected?: string;
  complications?: string;
  [key: string]: any;
}

export interface ISurgeryCase {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  leadSurgeonId: Types.ObjectId;
  theatreId: string;
  procedureName: string;
  icdCode?: string;
  urgency: UrgencyLevel;
  status: SurgeryStatus;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  anesthesiaType: AnesthesiaType;
  surgicalTeam: ISurgicalTeamMember[];
  preOpAssessment?: IPreOpAssessment;
  consent?: ISurgicalConsent;
  equipmentChecklist: IEquipmentItem[];
  consumablesUsed: IConsumableItem[];
  whoChecklist: IWHOChecklist;
  vitalsTimeline: IIntraopVitalsLog[];
  intraopDocs?: IIntraopDocumentation;
  anesthesiaNotes?: string;
  postOpNotes?: string;
  cancellationReason?: string;
  [key: string]: any;
}

export interface ISurgeryCaseDocument extends ISurgeryCase, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSurgeryCaseInput {
  hospitalId: string;
  patientId: string;
  leadSurgeonId: string;
  theatreId: string;
  procedureName: string;
  icdCode?: string;
  urgency?: UrgencyLevel;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  anesthesiaType: AnesthesiaType;
  surgicalTeam?: {
    userId: string;
    role: SurgicalRole;
    credentialVerified?: boolean;
    notes?: string;
  }[];
  [key: string]: any;
}

export interface UpdatePreOpInput {
  asaClassification?: ASAClassification;
  mallampatiScore?: 'CLASS_I' | 'CLASS_II' | 'CLASS_III' | 'CLASS_IV';
  vteRiskScore?: string;
  infectionScreeningNotes?: string;
  pregnancyStatus?: 'NOT_APPLICABLE' | 'NEGATIVE' | 'POSITIVE';
  preOpVitals?: {
    bpSystolic?: number;
    bpDiastolic?: number;
    heartRate?: number;
    tempCelsius?: number;
    spO2?: number;
  };
  clearedForSurgery?: boolean;
  clearedBy?: string;
  [key: string]: any;
}

export interface UpdateConsentInput {
  procedureConsent: boolean;
  anesthesiaConsent: boolean;
  bloodTransfusionConsent: boolean;
  highRiskConsent?: boolean;
  signedByPatient: boolean;
  witnessName?: string;
  digitalSignatureUrl?: string;
  [key: string]: any;
}

export interface UpdateWHOChecklistInput {
  stage: 'signIn' | 'timeOut' | 'signOut';
  completedBy: string;
  data: Record<string, unknown>;
  [key: string]: any;
}

export interface AddVitalsLogInput {
  bpSystolic?: number;
  bpDiastolic?: number;
  heartRate?: number;
  spO2?: number;
  respRate?: number;
  tempCelsius?: number;
  etCO2?: number;
  ecgRhythm?: string;
  notes?: string;
  [key: string]: any;
}

export interface UpdateIntraopInput {
  incisionTime?: Date;
  closureTime?: Date;
  operativeDiagnosis?: string;
  postOperativeDiagnosis?: string;
  surgicalFindings?: string;
  techniqueNotes?: string;
  eblMl?: number;
  fluidsAdministeredMl?: number;
  bloodProductsAdministered?: string;
  drainsInserted?: string;
  implantsUsed?: string;
  specimensCollected?: string;
  complications?: string;
  consumablesUsed?: IConsumableItem[];
  equipmentChecklist?: IEquipmentItem[];
  [key: string]: any;
}

export interface CompleteSurgeryInput {
  anesthesiaNotes?: string;
  postOpNotes?: string;
  intraopDocs?: UpdateIntraopInput;
  [key: string]: any;
}

export interface GetSurgeryCasesQuery {
  page?: number;
  limit?: number;
  status?: SurgeryStatus;
  theatreId?: string;
  leadSurgeonId?: string;
  patientId?: string;
  date?: string;
  [key: string]: any;
}
