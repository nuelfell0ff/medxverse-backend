import { Document, Types } from 'mongoose';

export enum SurgeryStatus {
  SCHEDULED = 'SCHEDULED',
  PRE_OP_PREPARATION = 'PRE_OP_PREPARATION',
  READY_FOR_THEATRE = 'READY_FOR_THEATRE',
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

export type SurgeryAccessRole = string;

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

export enum ConsentType {
  PROCEDURE = 'PROCEDURE',
  ANESTHESIA = 'ANESTHESIA',
  BLOOD_TRANSFUSION = 'BLOOD_TRANSFUSION',
  HIGH_RISK = 'HIGH_RISK',
  ADDITIONAL_PROCEDURE = 'ADDITIONAL_PROCEDURE',
}

export enum MedicationStatus {
  PLANNED = 'PLANNED',
  ADMINISTERED = 'ADMINISTERED',
  HELD = 'HELD',
  CANCELLED = 'CANCELLED',
}

export enum EquipmentStatus {
  AVAILABLE = 'AVAILABLE',
  IN_USE = 'IN_USE',
  MAINTENANCE = 'MAINTENANCE',
  UNAVAILABLE = 'UNAVAILABLE',
}

export interface ISurgicalTeamMember {
  userId: Types.ObjectId;
  role: SurgicalRole;
  credentialVerified: boolean;
  assignedAt?: Date;
  notes?: string;
}

export interface IPreOpVitals {
  bpSystolic?: number;
  bpDiastolic?: number;
  heartRate?: number;
  tempCelsius?: number;
  spO2?: number;
  respiratoryRate?: number;
  weightKg?: number;
  heightCm?: number;
}

export interface IPreOpAssessment {
  toObject?: () => IPreOpAssessment;
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
  airwayAssessment?: string;
  vteRiskScore?: string;
  infectionScreeningNotes?: string;
  pregnancyStatus?: 'NOT_APPLICABLE' | 'NEGATIVE' | 'POSITIVE' | 'UNKNOWN';
  preOpVitals?: IPreOpVitals;
  optimizationChecklist?: {
    fastingConfirmed?: boolean;
    bloodAvailable?: boolean;
    investigationsReviewed?: boolean;
    medicationsReviewed?: boolean;
    allergiesReviewed?: boolean;
    airwayAssessed?: boolean;
    consentCompleted?: boolean;
    siteMarked?: boolean;
    patientIdentified?: boolean;
  };
  clearedForSurgery?: boolean;
  clearedAt?: Date;
  clearedBy?: Types.ObjectId;
  notes?: string;
}

export interface IConsentVersion {
  version: number;
  type: ConsentType;
  consented: boolean;
  signedByPatient: boolean;
  witnessName?: string;
  witnessId?: Types.ObjectId;
  digitalSignatureUrl?: string;
  signedAt?: Date;
  recordedBy?: Types.ObjectId;
  notes?: string;
}

export interface ISurgicalConsent {
  toObject?: () => ISurgicalConsent;
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
  versions: IConsentVersion[];
}

export interface IPreOpMedication {
  medicationName: string;
  dose?: string;
  route?: string;
  scheduledAt?: Date;
  administeredAt?: Date;
  administeredBy?: Types.ObjectId;
  status: MedicationStatus;
  indication?: string;
  notes?: string;
}

export interface IEquipmentItem {
  itemName: string;
  category?: string;
  equipmentId?: string;
  status: EquipmentStatus;
  sterileStatus: SterilizationStatus;
  maintenanceOk: boolean;
  sterilizationBatch?: string;
  lastSterilizedAt?: Date;
  expiryDate?: Date;
  quantity?: number;
  notes?: string;
}

export interface IInstrumentItem {
  instrumentName: string;
  instrumentId?: string;
  quantityExpected: number;
  quantityPresent: number;
  sterilizationStatus: SterilizationStatus;
  notes?: string;
}

export interface IConsumableItem {
  itemName: string;
  category?: string;
  quantityUsed: number;
  unit?: string;
  unitCost?: number;
  lotNumber?: string;
  expiryDate?: Date;
  notes?: string;
}

export interface IWHOSignIn {
  completed: boolean;
  completedAt?: Date;
  completedBy?: Types.ObjectId;
  patientIdentityConfirmed?: boolean;
  procedureConfirmed?: boolean;
  siteSideConfirmed?: boolean;
  consentVerified?: boolean;
  anesthesiaSafetyConfirmed?: boolean;
  pulseOximeterOn?: boolean;
  allergiesReviewed?: boolean;
  allergyKnown?: boolean;
  airwayRisk?: boolean;
  bloodLossRisk?: boolean;
  bloodLossRiskOver500ml?: boolean;
  siteMarked?: boolean;
  notes?: string;
}

export interface IWHOTimeOut {
  completed: boolean;
  completedAt?: Date;
  completedBy?: Types.ObjectId;
  patientConfirmed?: boolean;
  patientIdentityConfirmed?: boolean;
  procedureConfirmed?: boolean;
  surgicalSiteConfirmed?: boolean;
  confirmPatientSiteProcedure?: boolean;
  consentVerified?: boolean;
  siteMarked?: boolean;
  teamIntroduced?: boolean;
  antibioticProphylaxisConfirmed?: boolean;
  antibioticProphylaxisGiven?: boolean;
  imagingAvailable?: boolean;
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
  instrumentCountCorrect?: boolean;
  spongeCountCorrect?: boolean;
  needleCountCorrect?: boolean;
  specimenLabeled?: boolean;
  equipmentIssuesNoted?: string;
  postOperativePlan?: string;
  postOpRecoveryPlan?: string;
  countsCorrect?: boolean;
  notes?: string;
}

export interface IWHOChecklist {
  toObject?: () => IWHOChecklist;
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
  oxygenFlow?: string;
  ventilationMode?: string;
  anesthesiaEvent?: string;
  notes?: string;
}

export interface IAnesthesiaRecord {
  preAnestheticAssessment?: string;
  airwayManagement?: string;
  airwayDevice?: string;
  anesthesiaType?: AnesthesiaType;
  drugs?: {
    name: string;
    dose?: string;
    route?: string;
    administeredAt?: Date;
    administeredBy?: Types.ObjectId;
  }[];
  fluidsMl?: number;
  bloodLossMl?: number;
  urineOutputMl?: number;
  complications?: string;
  recoveryAssessment?: string;
  notes?: string;
}

export interface IIntraopDocumentation {
  toObject?: () => IIntraopDocumentation;
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
  implantsUsed?: string;
  specimensCollected?: string;
  complications?: string;
  surgeonNotes?: string;
}

export interface IRecoveryAssessment {
  arrivalTime?: Date;
  consciousness?: string;
  airway?: string;
  breathing?: string;
  circulation?: string;
  painScore?: number;
  nauseaVomiting?: boolean;
  dischargeCriteriaMet?: boolean;
  assessedBy?: Types.ObjectId;
  notes?: string;
}

export interface ISurgeryCase {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  leadSurgeonId: Types.ObjectId;

  theatreId: string;
  procedureName: string;
  icdCode?: string;

  urgency: UrgencyLevel;
  priority?: number;

  status: SurgeryStatus;

  scheduledStartTime: Date;
  scheduledEndTime: Date;
  estimatedDurationMinutes?: number;

  actualStartTime?: Date;
  actualEndTime?: Date;

  anesthesiaType: AnesthesiaType;

  surgicalTeam: ISurgicalTeamMember[];

  preOpAssessment?: IPreOpAssessment;
  consent?: ISurgicalConsent;

  medications: IPreOpMedication[];

  equipmentChecklist: IEquipmentItem[];
  instrumentChecklist: IInstrumentItem[];
  consumablesUsed: IConsumableItem[];

  whoChecklist: IWHOChecklist;

  vitalsTimeline: IIntraopVitalsLog[];

  anesthesiaRecord?: IAnesthesiaRecord;
  intraopDocs?: IIntraopDocumentation;
  recoveryAssessment?: IRecoveryAssessment;

  postOpNotes?: string;

  cancellationReason?: string;
  postponementReason?: string;

  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export interface ISurgeryCaseDocument extends ISurgeryCase, Document {}

export interface CreateSurgeryCaseInput {
  patientId: string;
  leadSurgeonId: string;
  theatreId: string;
  procedureName: string;
  icdCode?: string;
  urgency?: UrgencyLevel;
  priority?: number;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  anesthesiaType: AnesthesiaType;
  surgicalTeam?: {
    userId: string;
    role: SurgicalRole;
    credentialVerified?: boolean;
    notes?: string;
  }[];
  estimatedDurationMinutes?: number;
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
  airwayAssessment?: string;
  vteRiskScore?: string;
  infectionScreeningNotes?: string;
  pregnancyStatus?: 'NOT_APPLICABLE' | 'NEGATIVE' | 'POSITIVE' | 'UNKNOWN';
  preOpVitals?: IPreOpVitals;
  optimizationChecklist?: IPreOpAssessment['optimizationChecklist'];
  clearedForSurgery?: boolean;
  notes?: string;
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

export interface UpdateTeamInput {
  surgicalTeam: {
    userId: string;
    role: SurgicalRole;
    credentialVerified?: boolean;
    notes?: string;
  }[];
}

export interface UpdateMedicationInput {
  medicationName: string;
  dose?: string;
  route?: string;
  scheduledAt?: Date;
  indication?: string;
  notes?: string;
}

export interface AdministerMedicationInput {
  medicationId: string;
  notes?: string;
}

export interface UpdateWHOChecklistInput {
  stage: 'signIn' | 'timeOut' | 'signOut';
  data: Record<string, unknown>;
}

export interface AddVitalsLogInput {
  timestamp?: Date;
  bpSystolic?: number;
  bpDiastolic?: number;
  heartRate?: number;
  spO2?: number;
  respRate?: number;
  tempCelsius?: number;
  etCO2?: number;
  ecgRhythm?: string;
  oxygenFlow?: string;
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
  implantsUsed?: string;
  specimensCollected?: string;
  complications?: string;
  surgeonNotes?: string;
}

export interface UpdateAnesthesiaInput {
  preAnestheticAssessment?: string;
  airwayManagement?: string;
  airwayDevice?: string;
  anesthesiaType?: AnesthesiaType;
  drugs?: {
    name: string;
    dose?: string;
    route?: string;
    administeredAt?: Date;
  }[];
  fluidsMl?: number;
  bloodLossMl?: number;
  urineOutputMl?: number;
  complications?: string;
  recoveryAssessment?: string;
  notes?: string;
}

export interface CompleteSurgeryInput {
  postOpNotes?: string;
  intraopDocs?: UpdateIntraopInput;
}

export interface RecoveryInput {
  consciousness?: string;
  airway?: string;
  breathing?: string;
  circulation?: string;
  painScore?: number;
  nauseaVomiting?: boolean;
  dischargeCriteriaMet?: boolean;
  notes?: string;
}

export interface RescheduleSurgeryInput {
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  theatreId?: string;
  reason?: string;
}

export interface GetSurgeryCasesQuery {
  page?: number;
  limit?: number;
  status?: SurgeryStatus;
  urgency?: UrgencyLevel;
  theatreId?: string;
  leadSurgeonId?: string;
  patientId?: string;
  date?: string;
}