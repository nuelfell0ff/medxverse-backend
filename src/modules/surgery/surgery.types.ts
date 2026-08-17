import { Document, Types } from 'mongoose';

/**
 * ============================================================
 * SURGERY STATUS
 * ============================================================
 */

export enum SurgeryStatus {
  SCHEDULED = 'SCHEDULED',
  PRE_OP_PREPARATION = 'PRE_OP_PREPARATION',
  READY_FOR_SURGERY = 'READY_FOR_SURGERY',
  IN_PROGRESS = 'IN_PROGRESS',
  RECOVERY = 'RECOVERY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  POSTPONED = 'POSTPONED',
}

/**
 * ============================================================
 * URGENCY / PRIORITY
 * ============================================================
 */

export enum UrgencyLevel {
  ELECTIVE = 'ELECTIVE',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY',
}

export enum SurgeryPriority {
  LOW = 'LOW',
  ROUTINE = 'ROUTINE',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * ============================================================
 * ANAESTHESIA
 * ============================================================
 */

export enum AnesthesiaType {
  GENERAL = 'GENERAL',
  REGIONAL = 'REGIONAL',
  LOCAL = 'LOCAL',
  SPINAL = 'SPINAL',
  EPIDURAL = 'EPIDURAL',
  SEDATION = 'SEDATION',
  COMBINED = 'COMBINED',
}

/**
 * ============================================================
 * SURGICAL TEAM
 * ============================================================
 */

export enum SurgicalRole {
  PRIMARY_SURGEON = 'PRIMARY_SURGEON',
  ASSISTING_SURGEON = 'ASSISTING_SURGEON',
  ANAESTHETIST = 'ANAESTHETIST',
  SCRUB_NURSE = 'SCRUB_NURSE',
  CIRCULATING_NURSE = 'CIRCULATING_NURSE',
  THEATRE_TECHNICIAN = 'THEATRE_TECHNICIAN',
}

/**
 * ============================================================
 * ASA CLASSIFICATION
 * ============================================================
 */

export enum ASAClassification {
  ASA_1 = 'ASA_1',
  ASA_2 = 'ASA_2',
  ASA_3 = 'ASA_3',
  ASA_4 = 'ASA_4',
  ASA_5 = 'ASA_5',
  ASA_6 = 'ASA_6',
  ASA_E = 'ASA_E',
}

/**
 * ============================================================
 * STERILIZATION
 * ============================================================
 */

export enum SterilizationStatus {
  STERILE = 'STERILE',
  PENDING = 'PENDING',
  EXPIRED = 'EXPIRED',
}

/**
 * ============================================================
 * MEDICATION
 * ============================================================
 */

export enum MedicationTiming {
  PRE_OPERATIVE = 'PRE_OPERATIVE',
  INTRAOPERATIVE = 'INTRAOPERATIVE',
  POST_OPERATIVE = 'POST_OPERATIVE',
}

export interface ISurgeryMedication {
  medicationName: string;
  dose?: string;
  route?: string;
  frequency?: string;
  timing: MedicationTiming;
  administered: boolean;
  administeredAt?: Date;
  administeredBy?: Types.ObjectId;
  notes?: string;
}

/**
 * ============================================================
 * SURGICAL TEAM
 * ============================================================
 */

export interface ISurgicalTeamMember {
  userId: Types.ObjectId;
  role: SurgicalRole;
  credentialVerified: boolean;
  assignedAt?: Date;
  notes?: string;
}

/**
 * ============================================================
 * PRE-OPERATIVE ASSESSMENT
 * ============================================================
 */

export interface IPreOpAssessment {
  diagnosis?: string;
  indicationForSurgery?: string;

  surgicalHistory?: string;
  medicalHistory?: string;

  allergies?: string[];
  currentMedications?: string[];

  laboratoryResults?: string;
  imagingResults?: string;

  anaestheticAssessment?: string;

  asaClassification?: ASAClassification;

  mallampatiScore?:
    | 'CLASS_I'
    | 'CLASS_II'
    | 'CLASS_III'
    | 'CLASS_IV';

  vteRiskScore?: string;

  infectionScreeningNotes?: string;

  pregnancyStatus?:
    | 'NOT_APPLICABLE'
    | 'NEGATIVE'
    | 'POSITIVE';

  preOpVitals?: {
    bpSystolic?: number;
    bpDiastolic?: number;
    heartRate?: number;
    respiratoryRate?: number;
    tempCelsius?: number;
    spO2?: number;
  };

  optimizationChecklist?: {
    fastingConfirmed?: boolean;
    labsReviewed?: boolean;
    imagingReviewed?: boolean;
    bloodAvailable?: boolean;
    medicationsReviewed?: boolean;
    allergiesReviewed?: boolean;
    infectionScreeningCompleted?: boolean;
    anaesthesiaAssessmentCompleted?: boolean;
  };

  clearedForSurgery?: boolean;
  clearedAt?: Date;
  clearedBy?: Types.ObjectId;

  notes?: string;
}

/**
 * ============================================================
 * CONSENT
 * ============================================================
 */

export interface ISurgicalConsentVersion {
  version: number;
  procedureConsent: boolean;
  anesthesiaConsent: boolean;
  bloodTransfusionConsent: boolean;
  highRiskConsent: boolean;
  additionalProcedureConsent?: boolean;

  signedByPatient: boolean;

  patientSignatureUrl?: string;
  witnessName?: string;
  witnessSignatureUrl?: string;

  signedAt?: Date;
  recordedBy?: Types.ObjectId;

  notes?: string;
}

export interface ISurgicalConsent {
  procedureConsent: boolean;
  anesthesiaConsent: boolean;
  bloodTransfusionConsent: boolean;
  highRiskConsent: boolean;
  additionalProcedureConsent: boolean;

  signedByPatient: boolean;

  patientSignatureUrl?: string;
  witnessName?: string;
  witnessSignatureUrl?: string;

  signedAt?: Date;

  currentVersion: number;
  versionHistory: ISurgicalConsentVersion[];

  notes?: string;
}

/**
 * ============================================================
 * EQUIPMENT
 * ============================================================
 */

export interface IEquipmentItem {
  itemId?: string;
  itemName: string;

  required: boolean;

  available: boolean;

  sterileStatus: SterilizationStatus;

  maintenanceOk: boolean;

  sterilizationBatchId?: string;

  notes?: string;
}

/**
 * ============================================================
 * CONSUMABLES
 * ============================================================
 */

export interface IConsumableItem {
  itemId?: string;
  itemName: string;

  quantityRequired?: number;
  quantityUsed: number;

  unitCost?: number;

  lotNumber?: string;

  expiryDate?: Date;

  stockDeducted?: boolean;

  notes?: string;
}

/**
 * ============================================================
 * WHO SURGICAL SAFETY CHECKLIST
 * ============================================================
 */

export interface IWHOSignIn {
  completed: boolean;
  completedAt?: Date;
  completedBy?: Types.ObjectId;

  patientIdentityConfirmed?: boolean;
  procedureConfirmed?: boolean;
  siteConfirmed?: boolean;

  consentVerified?: boolean;

  anesthesiaSafetyChecked?: boolean;
  pulseOximeterOn?: boolean;

  allergiesChecked?: boolean;
  airwayRisk?: boolean;
  bloodLossRiskOver500ml?: boolean;

  notes?: string;
}

export interface IWHOTimeOut {
  completed: boolean;
  completedAt?: Date;
  completedBy?: Types.ObjectId;

  patientConfirmed?: boolean;
  procedureConfirmed?: boolean;
  surgicalSiteConfirmed?: boolean;

  teamIntroduced?: boolean;

  antibioticProphylaxisGiven?: boolean;

  imagingAvailable?: boolean;

  criticalConcernsSurgeon?: string;
  criticalConcernsAnaesthetist?: string;
  criticalConcernsNursing?: string;

  notes?: string;
}

export interface IWHOSignOut {
  completed: boolean;
  completedAt?: Date;
  completedBy?: Types.ObjectId;

  procedurePerformed?: string;

  instrumentCount?: number;
  spongeCount?: number;
  needleCount?: number;

  countsCorrect?: boolean;

  specimenCollected?: boolean;
  specimenLabeled?: boolean;

  equipmentIssuesNoted?: string;

  postOperativePlan?: string;
  recoveryPlan?: string;

  notes?: string;
}

export interface IWHOChecklist {
  signIn: IWHOSignIn;
  timeOut: IWHOTimeOut;
  signOut: IWHOSignOut;
}

/**
 * ============================================================
 * INTRAOPERATIVE VITALS
 * ============================================================
 */

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

  notes?: string;
}

/**
 * ============================================================
 * ANAESTHESIA RECORD
 * ============================================================
 */

export interface IAnesthesiaRecord {
  preAnaestheticAssessment?: string;

  anesthesiaType?: AnesthesiaType;

  airwayManagement?: string;

  airwayDevice?: string;

  inductionDetails?: string;

  maintenanceDetails?: string;

  anestheticDrugs?: ISurgeryMedication[];

  monitoring?: string;

  oxygenVentilationData?: string;

  fluidsAdministeredMl?: number;

  bloodLossMl?: number;

  bloodProducts?: string;

  complications?: string;

  recoveryAssessment?: string;

  notes?: string;
}

/**
 * ============================================================
 * SPECIMENS
 * ============================================================
 */

export interface ISpecimen {
  specimenType: string;
  description?: string;

  containerLabel?: string;

  sentToLaboratory?: boolean;
  sentAt?: Date;

  notes?: string;
}

/**
 * ============================================================
 * INTRAOPERATIVE DOCUMENTATION
 * ============================================================
 */

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

  estimatedBloodLossMl?: number;

  fluidsAdministeredMl?: number;

  bloodProductsAdministered?: string;

  drainsInserted?: string;

  implantsUsed?: string;

  specimens?: ISpecimen[];

  complications?: string;

  surgeonNotes?: string;

  notes?: string;
}

/**
 * ============================================================
 * RECOVERY
 * ============================================================
 */

export interface IRecoveryAssessment {
  arrivalTime?: Date;

  consciousnessLevel?: string;

  airwayStatus?: string;

  breathingStatus?: string;

  circulationStatus?: string;

  painScore?: number;

  nauseaVomiting?: boolean;

  recoveryNotes?: string;

  dischargedFromRecovery?: boolean;

  dischargedAt?: Date;

  dischargedBy?: Types.ObjectId;
}

/**
 * ============================================================
 * SURGERY CASE
 * ============================================================
 */

export interface ISurgeryCase {
  hospitalId: Types.ObjectId;

  patientId: Types.ObjectId;

  leadSurgeonId: Types.ObjectId;

  theatreId: string;

  procedureName: string;

  icdCode?: string;

  urgency: UrgencyLevel;

  priority: SurgeryPriority;

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

  preOpMedications: ISurgeryMedication[];

  intraOpMedications: ISurgeryMedication[];

  equipmentChecklist: IEquipmentItem[];

  consumablesUsed: IConsumableItem[];

  whoChecklist: IWHOChecklist;

  vitalsTimeline: IIntraopVitalsLog[];

  intraopDocs?: IIntraopDocumentation;

  anesthesiaRecord?: IAnesthesiaRecord;

  recoveryAssessment?: IRecoveryAssessment;

  cancellationReason?: string;

  postponedReason?: string;

  rescheduledFrom?: Date;

  rescheduledAt?: Date;

  rescheduledBy?: Types.ObjectId;

  createdBy?: Types.ObjectId;

  updatedBy?: Types.ObjectId;
}

export interface ISurgeryCaseDocument
  extends ISurgeryCase,
    Document {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ============================================================
 * CREATE
 * ============================================================
 */

export interface CreateSurgeryCaseInput {
  hospitalId: string;

  patientId: string;

  leadSurgeonId: string;

  theatreId: string;

  procedureName: string;

  icdCode?: string;

  urgency?: UrgencyLevel;

  priority?: SurgeryPriority;

  scheduledStartTime: Date;

  scheduledEndTime: Date;

  estimatedDurationMinutes?: number;

  anesthesiaType: AnesthesiaType;

  surgicalTeam?: {
    userId: string;
    role: SurgicalRole;
    credentialVerified?: boolean;
    notes?: string;
  }[];
}

/**
 * ============================================================
 * PRE-OP
 * ============================================================
 */

export interface UpdatePreOpInput {
  diagnosis?: string;
  indicationForSurgery?: string;

  surgicalHistory?: string;
  medicalHistory?: string;

  allergies?: string[];
  currentMedications?: string[];

  laboratoryResults?: string;
  imagingResults?: string;

  anaestheticAssessment?: string;

  asaClassification?: ASAClassification;

  mallampatiScore?:
    | 'CLASS_I'
    | 'CLASS_II'
    | 'CLASS_III'
    | 'CLASS_IV';

  vteRiskScore?: string;

  infectionScreeningNotes?: string;

  pregnancyStatus?:
    | 'NOT_APPLICABLE'
    | 'NEGATIVE'
    | 'POSITIVE';

  preOpVitals?: IPreOpAssessment['preOpVitals'];

  optimizationChecklist?: IPreOpAssessment['optimizationChecklist'];

  clearedForSurgery?: boolean;

  notes?: string;
}

/**
 * ============================================================
 * CONSENT
 * ============================================================
 */

export interface UpdateConsentInput {
  procedureConsent: boolean;
  anesthesiaConsent: boolean;
  bloodTransfusionConsent: boolean;

  highRiskConsent?: boolean;

  additionalProcedureConsent?: boolean;

  signedByPatient: boolean;

  patientSignatureUrl?: string;

  witnessName?: string;

  witnessSignatureUrl?: string;

  notes?: string;
}

/**
 * ============================================================
 * WHO CHECKLIST
 * ============================================================
 */

export interface UpdateWHOChecklistInput {
  stage: 'signIn' | 'timeOut' | 'signOut';

  completedBy: string;

  data: Record<string, unknown>;
}

/**
 * ============================================================
 * VITALS
 * ============================================================
 */

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

  notes?: string;
}

/**
 * ============================================================
 * INTRA-OP
 * ============================================================
 */

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

  estimatedBloodLossMl?: number;

  fluidsAdministeredMl?: number;

  bloodProductsAdministered?: string;

  drainsInserted?: string;

  implantsUsed?: string;

  specimens?: ISpecimen[];

  complications?: string;

  surgeonNotes?: string;

  notes?: string;

  consumablesUsed?: IConsumableItem[];

  equipmentChecklist?: IEquipmentItem[];
}

/**
 * ============================================================
 * ANAESTHESIA
 * ============================================================
 */

export interface UpdateAnesthesiaInput
  extends Partial<IAnesthesiaRecord> {
  anesthesiaType?: AnesthesiaType;
}

/**
 * ============================================================
 * MEDICATION
 * ============================================================
 */

export interface AddMedicationInput {
  medicationName: string;

  dose?: string;
  route?: string;
  frequency?: string;

  timing: MedicationTiming;

  administered?: boolean;

  administeredAt?: Date;

  notes?: string;
}

/**
 * ============================================================
 * RECOVERY
 * ============================================================
 */

export interface UpdateRecoveryInput
  extends Partial<IRecoveryAssessment> {}

/**
 * ============================================================
 * RESCHEDULING
 * ============================================================
 */

export interface RescheduleSurgeryInput {
  scheduledStartTime: Date;
  scheduledEndTime: Date;

  reason?: string;
}

/**
 * ============================================================
 * COMPLETE
 * ============================================================
 */

export interface CompleteSurgeryInput {
  anesthesiaRecord?: IAnesthesiaRecord;

  postOpNotes?: string;

  intraopDocs?: UpdateIntraopInput;

  recoveryAssessment?: IRecoveryAssessment;
}

/**
 * ============================================================
 * QUERY
 * ============================================================
 */

export interface GetSurgeryCasesQuery {
  page?: number;
  limit?: number;

  status?: SurgeryStatus;

  urgency?: UrgencyLevel;

  priority?: SurgeryPriority;

  theatreId?: string;

  leadSurgeonId?: string;

  patientId?: string;

  date?: string;

  fromDate?: string;

  toDate?: string;
}
