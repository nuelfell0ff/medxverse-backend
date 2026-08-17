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

export enum PriorityLevel {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
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

export enum MedicationStatus {
  ORDERED = 'ORDERED',
  ADMINISTERED = 'ADMINISTERED',
  HELD = 'HELD',
  CANCELLED = 'CANCELLED',
}

export enum ConsentType {
  PROCEDURE = 'PROCEDURE',
  ANESTHESIA = 'ANESTHESIA',
  BLOOD_TRANSFUSION = 'BLOOD_TRANSFUSION',
  HIGH_RISK = 'HIGH_RISK',
  ADDITIONAL_PROCEDURE = 'ADDITIONAL_PROCEDURE',
}

export interface ISurgicalTeamMember {
  userId: Types.ObjectId;
  role: SurgicalRole;
  credentialVerified: boolean;
  available?: boolean;
  notes?: string;
}

export interface IPreOpVitals {
  bpSystolic?: number;
  bpDiastolic?: number;
  heartRate?: number;
  tempCelsius?: number;
  spO2?: number;
  respiratoryRate?: number;
}

export interface IPreOpAssessment {
  diagnosis?: string;
  surgicalIndication?: string;
  surgicalHistory?: string;
  medicalHistory?: string;
  allergies?: string[];
  currentMedications?: string[];
  laboratoryResults?: string;
  imagingResults?: string;
  anestheticAssessment?: string;
  asaClassification?: ASAClassification;
  mallampatiScore?: 'CLASS_I' | 'CLASS_II' | 'CLASS_III' | 'CLASS_IV';
  vteRiskScore?: string;
  infectionScreening?: string;
  pregnancyStatus?: 'NOT_APPLICABLE' | 'NEGATIVE' | 'POSITIVE' | 'UNKNOWN';
  preOpVitals?: IPreOpVitals;
  optimizationChecklist?: {
    fastingConfirmed?: boolean;
    labsReviewed?: boolean;
    imagingReviewed?: boolean;
    medicationsReviewed?: boolean;
    allergiesReviewed?: boolean;
    bloodAvailable?: boolean;
    anesthesiaReviewed?: boolean;
    patientIdentified?: boolean;
  };
  clearedForSurgery?: boolean;
  clearedAt?: Date;
  clearedBy?: Types.ObjectId;
}

export interface IConsentRecord {
  type: ConsentType;
  obtained: boolean;
  signedByPatient?: boolean;
  witnessName?: string;
  witnessId?: Types.ObjectId;
  digitalSignatureUrl?: string;
  version: number;
  signedAt?: Date;
  notes?: string;
}

export interface ISurgicalConsent {
  procedureConsent: boolean;
  anesthesiaConsent: boolean;
  bloodTransfusionConsent: boolean;
  highRiskConsent: boolean;
  additionalProcedureConsent: boolean;
  signedByPatient: boolean;
  witnessName?: string;
  witnessId?: Types.ObjectId;
  digitalSignatureUrl?: string;
  signedAt?: Date;
  currentVersion: number;
  history: IConsentRecord[];
}

export interface IPreOpMedication {
  medicationName: string;
  dose?: string;
  route?: string;
  scheduledTime?: Date;
  administeredAt?: Date;
  administeredBy?: Types.ObjectId;
  status: MedicationStatus;
  indication?: string;
  notes?: string;
}

export interface IEquipmentItem {
  itemName: string;
  category?: string;
  quantity?: number;
  sterileStatus: SterilizationStatus;
  maintenanceOk: boolean;
  sterilizationBatch?: string;
  expiryDate?: Date;
  required?: boolean;
  available?: boolean;
  notes?: string;
}

export interface IInstrumentItem {
  instrumentName: string;
  quantityRequired?: number;
  quantityAvailable?: number;
  sterileStatus: SterilizationStatus;
  sterilizationBatch?: string;
  countBefore?: number;
  countAfter?: number;
  notes?: string;
}

export interface IImplantItem {
  name: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  lotNumber?: string;
  expiryDate?: Date;
  quantity?: number;
}

export interface IConsumableItem {
  itemName: string;
  category?: string;
  quantityUsed: number;
  unitCost?: number;
  lotNumber?: string;
  expiryDate?: Date;
}

export interface IWHOSignIn {
  completed: boolean;
  completedAt?: Date;
  completedBy?: Types.ObjectId;
  patientIdentityConfirmed?: boolean;
  procedureConfirmed?: boolean;
  siteMarked?: boolean;
  consentVerified?: boolean;
  anesthesiaSafetyChecked?: boolean;
  pulseOximeterOn?: boolean;
  allergiesConfirmed?: boolean;
  airwayRisk?: boolean;
  bloodLossRiskOver500ml?: boolean;
}

export interface IWHOTimeOut {
  completed: boolean;
  completedAt?: Date;
  completedBy?: Types.ObjectId;
  patientConfirmed?: boolean;
  procedureConfirmed?: boolean;
  surgicalSiteConfirmed?: boolean;
  teamIntroduced?: boolean;
  antibioticProphylaxisConfirmed?: boolean;
  imagingDisplayed?: boolean;
  criticalConcernsSurgeon?: string;
  criticalConcernsAnaesthetist?: string;
  criticalConcernsNursing?: string;
}

export interface IWHOSignOut {
  completed: boolean;
  completedAt?: Date;
  completedBy?: Types.ObjectId;
  procedureRecorded?: string;
  instrumentCount?: number;
  spongeCount?: number;
  needleCount?: number;
  countsCorrect?: boolean;
  specimenLabeled?: boolean;
  equipmentIssuesNoted?: string;
  postOpRecoveryPlan?: string;
}

export interface IWHOChecklist {
  signIn: IWHOSignIn;
  timeOut: IWHOTimeOut;
  signOut: IWHOSignOut;
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
  oxygenFlow?: number;
  ventilationMode?: string;
  anesthesiaEvent?: string;
  notes?: string;
}

export interface IAnesthesiaDrug {
  medicationName: string;
  dose?: string;
  route?: string;
  administeredAt?: Date;
  administeredBy?: Types.ObjectId;
  notes?: string;
}

export interface IAnesthesiaRecord {
  preAnestheticAssessment?: string;
  anesthesiaType?: AnesthesiaType;
  airwayManagement?: string;
  airwayDevice?: string;
  drugs: IAnesthesiaDrug[];
  oxygenVentilation?: string;
  fluidBalanceMl?: number;
  bloodLossMl?: number;
  complications?: string;
  recoveryAssessment?: string;
  notes?: string;
}

export interface IIntraopDocumentation {
  procedureStartTime?: Date;
  procedureEndTime?: Date;
  incisionTime?: Date;
  closureTime?: Date;
  operativeDiagnosis?: string;
  postOperativeDiagnosis?: string;
  procedurePerformed?: string;
  surgicalFindings?: string;
  techniqueNotes?: string;
  eblMl?: number;
  fluidsAdministeredMl?: number;
  bloodProductsAdministered?: string;
  drainsInserted?: string;
  implantsUsed?: IImplantItem[];
  specimensCollected?: string;
  complications?: string;
  surgeonNotes?: string;
}

export interface ISurgeryCase {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;

  procedureName: string;
  icdCode?: string;

  theatreId: string;

  urgency: UrgencyLevel;
  priority: PriorityLevel;

  status: SurgeryStatus;

  scheduledStartTime: Date;
  scheduledEndTime: Date;
  estimatedDurationMinutes: number;

  actualStartTime?: Date;
  actualEndTime?: Date;

  leadSurgeonId: Types.ObjectId;

  surgicalTeam: ISurgicalTeamMember[];

  anesthesiaType: AnesthesiaType;

  preOpAssessment?: IPreOpAssessment;

  consent?: ISurgicalConsent;

  preOpMedications: IPreOpMedication[];

  equipmentChecklist: IEquipmentItem[];
  instrumentChecklist: IInstrumentItem[];

  consumablesUsed: IConsumableItem[];
  implantsUsed: IImplantItem[];

  whoChecklist: IWHOChecklist;

  vitalsTimeline: IIntraopVitalsLog[];

  anesthesiaRecord?: IAnesthesiaRecord;

  intraopDocs?: IIntraopDocumentation;

  postOpNotes?: string;

  cancellationReason?: string;
  postponementReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface ISurgeryCaseDocument extends ISurgeryCase, Document {}

export interface CreateSurgeryCaseInput {
  hospitalId: string;
  patientId: string;
  leadSurgeonId: string;
  theatreId: string;
  procedureName: string;
  icdCode?: string;
  urgency?: UrgencyLevel;
  priority?: PriorityLevel;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  estimatedDurationMinutes?: number;
  anesthesiaType: AnesthesiaType;
  surgicalTeam?: {
    userId: string;
    role: SurgicalRole;
    credentialVerified?: boolean;
    available?: boolean;
    notes?: string;
  }[];
}

export interface UpdatePreOpInput {
  diagnosis?: string;
  surgicalIndication?: string;
  surgicalHistory?: string;
  medicalHistory?: string;
  allergies?: string[];
  currentMedications?: string[];
  laboratoryResults?: string;
  imagingResults?: string;
  anestheticAssessment?: string;
  asaClassification?: ASAClassification;
  mallampatiScore?: 'CLASS_I' | 'CLASS_II' | 'CLASS_III' | 'CLASS_IV';
  vteRiskScore?: string;
  infectionScreening?: string;
  pregnancyStatus?: 'NOT_APPLICABLE' | 'NEGATIVE' | 'POSITIVE' | 'UNKNOWN';
  preOpVitals?: IPreOpVitals;
  optimizationChecklist?: IPreOpAssessment['optimizationChecklist'];
  clearedForSurgery?: boolean;
}

export interface UpdateConsentInput {
  type?: ConsentType;
  procedureConsent?: boolean;
  anesthesiaConsent?: boolean;
  bloodTransfusionConsent?: boolean;
  highRiskConsent?: boolean;
  additionalProcedureConsent?: boolean;
  signedByPatient?: boolean;
  witnessName?: string;
  witnessId?: string;
  digitalSignatureUrl?: string;
  notes?: string;
}

export interface UpdateWHOChecklistInput {
  stage: 'signIn' | 'timeOut' | 'signOut';
  data: Record<string, unknown>;
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
  oxygenFlow?: number;
  ventilationMode?: string;
  anesthesiaEvent?: string;
  notes?: string;
}

export interface UpdateIntraopInput {
  procedureStartTime?: Date;
  procedureEndTime?: Date;
  incisionTime?: Date;
  closureTime?: Date;
  operativeDiagnosis?: string;
  postOperativeDiagnosis?: string;
  procedurePerformed?: string;
  surgicalFindings?: string;
  techniqueNotes?: string;
  eblMl?: number;
  fluidsAdministeredMl?: number;
  bloodProductsAdministered?: string;
  drainsInserted?: string;
  implantsUsed?: IImplantItem[];
  specimensCollected?: string;
  complications?: string;
  surgeonNotes?: string;
  consumablesUsed?: IConsumableItem[];
  equipmentChecklist?: IEquipmentItem[];
  instrumentChecklist?: IInstrumentItem[];
}

export interface UpdateAnesthesiaInput {
  preAnestheticAssessment?: string;
  anesthesiaType?: AnesthesiaType;
  airwayManagement?: string;
  airwayDevice?: string;
  drugs?: IAnesthesiaDrug[];
  oxygenVentilation?: string;
  fluidBalanceMl?: number;
  bloodLossMl?: number;
  complications?: string;
  recoveryAssessment?: string;
  notes?: string;
}

export interface CompleteSurgeryInput {
  anesthesiaRecord?: UpdateAnesthesiaInput;
  postOpNotes?: string;
  intraopDocs?: UpdateIntraopInput;
}

export interface GetSurgeryCasesQuery {
  page?: number;
  limit?: number;
  status?: SurgeryStatus;
  urgency?: UrgencyLevel;
  priority?: PriorityLevel;
  theatreId?: string;
  leadSurgeonId?: string;
  patientId?: string;
  date?: string;
}
