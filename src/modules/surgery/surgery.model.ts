import { Schema, model } from 'mongoose';
import {
  ISurgeryCaseDocument,
  SurgeryStatus,
  UrgencyLevel,
  AnesthesiaType,
  SurgicalRole,
  ASAClassification,
  SterilizationStatus,
} from './surgery.types.js';

const SurgicalTeamMemberSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    role: {
      type: String,
      enum: Object.values(SurgicalRole),
      required: true,
    },
    credentialVerified: { type: Boolean, default: false },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const PreOpAssessmentSchema = new Schema(
  {
    asaClassification: { type: String, enum: Object.values(ASAClassification) },
    mallampatiScore: { type: String, enum: ['CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IV'] },
    vteRiskScore: { type: String, trim: true },
    infectionScreeningNotes: { type: String, trim: true },
    pregnancyStatus: { type: String, enum: ['NOT_APPLICABLE', 'NEGATIVE', 'POSITIVE'], default: 'NOT_APPLICABLE' },
    preOpVitals: {
      bpSystolic: { type: Number },
      bpDiastolic: { type: Number },
      heartRate: { type: Number },
      tempCelsius: { type: Number },
      spO2: { type: Number },
    },
    clearedForSurgery: { type: Boolean, default: false },
    clearedAt: { type: Date },
    clearedBy: { type: Schema.Types.ObjectId, ref: 'Account' },
  },
  { _id: false }
);

const SurgicalConsentSchema = new Schema(
  {
    procedureConsent: { type: Boolean, required: true, default: false },
    anesthesiaConsent: { type: Boolean, required: true, default: false },
    bloodTransfusionConsent: { type: Boolean, required: true, default: false },
    highRiskConsent: { type: Boolean, default: false },
    signedByPatient: { type: Boolean, required: true, default: false },
    witnessName: { type: String, trim: true },
    digitalSignatureUrl: { type: String, trim: true },
    signedAt: { type: Date },
  },
  { _id: false }
);

const EquipmentItemSchema = new Schema(
  {
    itemName: { type: String, required: true, trim: true },
    sterileStatus: { type: String, enum: Object.values(SterilizationStatus), default: SterilizationStatus.STERILE },
    maintenanceOk: { type: Boolean, default: true },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const ConsumableItemSchema = new Schema(
  {
    itemName: { type: String, required: true, trim: true },
    quantityUsed: { type: Number, required: true, default: 1 },
    unitCost: { type: Number, default: 0 },
    lotNumber: { type: String, trim: true },
  },
  { _id: false }
);

const WHOSignInSchema = new Schema(
  {
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    completedBy: { type: Schema.Types.ObjectId, ref: 'Account' },
    patientIdentityConfirmed: { type: Boolean, default: false },
    siteMarked: { type: Boolean, default: false },
    consentVerified: { type: Boolean, default: false },
    pulseOximeterOn: { type: Boolean, default: false },
    allergyKnown: { type: Boolean, default: false },
    airwayRisk: { type: Boolean, default: false },
    bloodLossRiskOver500ml: { type: Boolean, default: false },
  },
  { _id: false }
);

const WHOTimeOutSchema = new Schema(
  {
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    completedBy: { type: Schema.Types.ObjectId, ref: 'Account' },
    teamIntroduced: { type: Boolean, default: false },
    confirmPatientSiteProcedure: { type: Boolean, default: false },
    antibioticProphylaxisGiven: { type: Boolean, default: false },
    imagingDisplayed: { type: Boolean, default: false },
    criticalConcernsSurgeon: { type: String, trim: true },
    criticalConcernsAnaesthetist: { type: String, trim: true },
    criticalConcernsNursing: { type: String, trim: true },
  },
  { _id: false }
);

const WHOSignOutSchema = new Schema(
  {
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    completedBy: { type: Schema.Types.ObjectId, ref: 'Account' },
    procedureRecorded: { type: String, trim: true },
    countsCorrect: { type: Boolean, default: false },
    specimenLabeled: { type: Boolean, default: false },
    equipmentIssuesNoted: { type: String, trim: true },
    postOpRecoveryPlan: { type: String, trim: true },
  },
  { _id: false }
);

const WHOChecklistSchema = new Schema(
  {
    signIn: { type: WHOSignInSchema, default: () => ({ completed: false }) },
    timeOut: { type: WHOTimeOutSchema, default: () => ({ completed: false }) },
    signOut: { type: WHOSignOutSchema, default: () => ({ completed: false }) },
  },
  { _id: false }
);

const IntraopVitalsSchema = new Schema(
  {
    timestamp: { type: Date, default: Date.now },
    bpSystolic: { type: Number },
    bpDiastolic: { type: Number },
    heartRate: { type: Number },
    spO2: { type: Number },
    respRate: { type: Number },
    tempCelsius: { type: Number },
    etCO2: { type: Number },
    ecgRhythm: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const IntraopDocumentationSchema = new Schema(
  {
    incisionTime: { type: Date },
    closureTime: { type: Date },
    operativeDiagnosis: { type: String, trim: true },
    postOperativeDiagnosis: { type: String, trim: true },
    surgicalFindings: { type: String, trim: true },
    techniqueNotes: { type: String, trim: true },
    eblMl: { type: Number, default: 0 },
    fluidsAdministeredMl: { type: Number, default: 0 },
    bloodProductsAdministered: { type: String, trim: true },
    drainsInserted: { type: String, trim: true },
    implantsUsed: { type: String, trim: true },
    specimensCollected: { type: String, trim: true },
    complications: { type: String, trim: true },
  },
  { _id: false }
);

const SurgeryCaseSchema = new Schema<ISurgeryCaseDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    leadSurgeonId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    theatreId: { type: String, required: true, index: true },
    procedureName: { type: String, required: true, trim: true },
    icdCode: { type: String, trim: true },
    urgency: {
      type: String,
      enum: Object.values(UrgencyLevel),
      default: UrgencyLevel.ELECTIVE,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(SurgeryStatus),
      default: SurgeryStatus.SCHEDULED,
      required: true,
      index: true,
    },
    scheduledStartTime: { type: Date, required: true },
    scheduledEndTime: { type: Date, required: true },
    actualStartTime: { type: Date },
    actualEndTime: { type: Date },
    anesthesiaType: {
      type: String,
      enum: Object.values(AnesthesiaType),
      required: true,
    },
    surgicalTeam: [SurgicalTeamMemberSchema],
    preOpAssessment: { type: PreOpAssessmentSchema },
    consent: { type: SurgicalConsentSchema },
    equipmentChecklist: [EquipmentItemSchema],
    consumablesUsed: [ConsumableItemSchema],
    whoChecklist: {
      type: WHOChecklistSchema,
      default: () => ({
        signIn: { completed: false },
        timeOut: { completed: false },
        signOut: { completed: false },
      }),
    },
    vitalsTimeline: [IntraopVitalsSchema],
    intraopDocs: { type: IntraopDocumentationSchema },
    anesthesiaNotes: { type: String, trim: true },
    postOpNotes: { type: String, trim: true },
    cancellationReason: { type: String, trim: true },
  },
  { timestamps: true }
);

SurgeryCaseSchema.index({ hospitalId: 1, theatreId: 1, scheduledStartTime: 1 });

export const SurgeryCaseModel = model<ISurgeryCaseDocument>('SurgeryCase', SurgeryCaseSchema);
