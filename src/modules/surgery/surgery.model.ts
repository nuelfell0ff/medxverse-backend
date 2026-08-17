import { Schema, model } from 'mongoose';
import {
  ISurgeryCaseDocument,
  SurgeryStatus,
  UrgencyLevel,
  PriorityLevel,
  AnesthesiaType,
  SurgicalRole,
  ASAClassification,
  SterilizationStatus,
  MedicationStatus,
  ConsentType,
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
    available: { type: Boolean, default: true },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const PreOpVitalsSchema = new Schema(
  {
    bpSystolic: Number,
    bpDiastolic: Number,
    heartRate: Number,
    tempCelsius: Number,
    spO2: Number,
    respiratoryRate: Number,
  },
  { _id: false }
);

const PreOpAssessmentSchema = new Schema(
  {
    diagnosis: String,
    surgicalIndication: String,
    surgicalHistory: String,
    medicalHistory: String,
    allergies: [String],
    currentMedications: [String],
    laboratoryResults: String,
    imagingResults: String,
    anestheticAssessment: String,

    asaClassification: {
      type: String,
      enum: Object.values(ASAClassification),
    },

    mallampatiScore: {
      type: String,
      enum: ['CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IV'],
    },

    vteRiskScore: String,
    infectionScreening: String,

    pregnancyStatus: {
      type: String,
      enum: ['NOT_APPLICABLE', 'NEGATIVE', 'POSITIVE', 'UNKNOWN'],
      default: 'NOT_APPLICABLE',
    },

    preOpVitals: PreOpVitalsSchema,

    optimizationChecklist: {
      fastingConfirmed: Boolean,
      labsReviewed: Boolean,
      imagingReviewed: Boolean,
      medicationsReviewed: Boolean,
      allergiesReviewed: Boolean,
      bloodAvailable: Boolean,
      anesthesiaReviewed: Boolean,
      patientIdentified: Boolean,
    },

    clearedForSurgery: { type: Boolean, default: false },
    clearedAt: Date,
    clearedBy: { type: Schema.Types.ObjectId, ref: 'Account' },
  },
  { _id: false }
);

const ConsentRecordSchema = new Schema(
  {
    type: {
      type: String,
      enum: Object.values(ConsentType),
      required: true,
    },
    obtained: { type: Boolean, default: false },
    signedByPatient: Boolean,
    witnessName: String,
    witnessId: { type: Schema.Types.ObjectId, ref: 'Account' },
    digitalSignatureUrl: String,
    version: { type: Number, required: true },
    signedAt: Date,
    notes: String,
  },
  { _id: false }
);

const SurgicalConsentSchema = new Schema(
  {
    procedureConsent: { type: Boolean, default: false },
    anesthesiaConsent: { type: Boolean, default: false },
    bloodTransfusionConsent: { type: Boolean, default: false },
    highRiskConsent: { type: Boolean, default: false },
    additionalProcedureConsent: { type: Boolean, default: false },
    signedByPatient: { type: Boolean, default: false },
    witnessName: String,
    witnessId: { type: Schema.Types.ObjectId, ref: 'Account' },
    digitalSignatureUrl: String,
    signedAt: Date,
    currentVersion: { type: Number, default: 1 },
    history: { type: [ConsentRecordSchema], default: [] },
  },
  { _id: false }
);

const PreOpMedicationSchema = new Schema(
  {
    medicationName: { type: String, required: true },
    dose: String,
    route: String,
    scheduledTime: Date,
    administeredAt: Date,
    administeredBy: { type: Schema.Types.ObjectId, ref: 'Account' },
    status: {
      type: String,
      enum: Object.values(MedicationStatus),
      default: MedicationStatus.ORDERED,
    },
    indication: String,
    notes: String,
  },
  { _id: true }
);

const EquipmentItemSchema = new Schema(
  {
    itemName: { type: String, required: true },
    category: String,
    quantity: { type: Number, default: 1 },
    sterileStatus: {
      type: String,
      enum: Object.values(SterilizationStatus),
      default: SterilizationStatus.STERILE,
    },
    maintenanceOk: { type: Boolean, default: true },
    sterilizationBatch: String,
    expiryDate: Date,
    required: { type: Boolean, default: true },
    available: { type: Boolean, default: true },
    notes: String,
  },
  { _id: false }
);

const InstrumentItemSchema = new Schema(
  {
    instrumentName: { type: String, required: true },
    quantityRequired: Number,
    quantityAvailable: Number,
    sterileStatus: {
      type: String,
      enum: Object.values(SterilizationStatus),
      default: SterilizationStatus.STERILE,
    },
    sterilizationBatch: String,
    countBefore: Number,
    countAfter: Number,
    notes: String,
  },
  { _id: false }
);

const ImplantItemSchema = new Schema(
  {
    name: { type: String, required: true },
    manufacturer: String,
    model: String,
    serialNumber: String,
    lotNumber: String,
    expiryDate: Date,
    quantity: Number,
  },
  { _id: false }
);

const ConsumableItemSchema = new Schema(
  {
    itemName: { type: String, required: true },
    category: String,
    quantityUsed: { type: Number, required: true, default: 1 },
    unitCost: { type: Number, default: 0 },
    lotNumber: String,
    expiryDate: Date,
  },
  { _id: false }
);

const WHOSignInSchema = new Schema(
  {
    completed: { type: Boolean, default: false },
    completedAt: Date,
    completedBy: { type: Schema.Types.ObjectId, ref: 'Account' },
    patientIdentityConfirmed: Boolean,
    procedureConfirmed: Boolean,
    siteMarked: Boolean,
    consentVerified: Boolean,
    anesthesiaSafetyChecked: Boolean,
    pulseOximeterOn: Boolean,
    allergiesConfirmed: Boolean,
    airwayRisk: Boolean,
    bloodLossRiskOver500ml: Boolean,
  },
  { _id: false }
);

const WHOTimeOutSchema = new Schema(
  {
    completed: { type: Boolean, default: false },
    completedAt: Date,
    completedBy: { type: Schema.Types.ObjectId, ref: 'Account' },
    patientConfirmed: Boolean,
    procedureConfirmed: Boolean,
    surgicalSiteConfirmed: Boolean,
    teamIntroduced: Boolean,
    antibioticProphylaxisConfirmed: Boolean,
    imagingDisplayed: Boolean,
    criticalConcernsSurgeon: String,
    criticalConcernsAnaesthetist: String,
    criticalConcernsNursing: String,
  },
  { _id: false }
);

const WHOSignOutSchema = new Schema(
  {
    completed: { type: Boolean, default: false },
    completedAt: Date,
    completedBy: { type: Schema.Types.ObjectId, ref: 'Account' },
    procedureRecorded: String,
    instrumentCount: Number,
    spongeCount: Number,
    needleCount: Number,
    countsCorrect: Boolean,
    specimenLabeled: Boolean,
    equipmentIssuesNoted: String,
    postOpRecoveryPlan: String,
  },
  { _id: false }
);

const WHOChecklistSchema = new Schema(
  {
    signIn: {
      type: WHOSignInSchema,
      default: () => ({ completed: false }),
    },
    timeOut: {
      type: WHOTimeOutSchema,
      default: () => ({ completed: false }),
    },
    signOut: {
      type: WHOSignOutSchema,
      default: () => ({ completed: false }),
    },
  },
  { _id: false }
);

const IntraopVitalsSchema = new Schema(
  {
    timestamp: { type: Date, default: Date.now },
    bpSystolic: Number,
    bpDiastolic: Number,
    heartRate: Number,
    spO2: Number,
    respRate: Number,
    tempCelsius: Number,
    etCO2: Number,
    ecgRhythm: String,
    oxygenFlow: Number,
    ventilationMode: String,
    anesthesiaEvent: String,
    notes: String,
  },
  { _id: false }
);

const AnesthesiaDrugSchema = new Schema(
  {
    medicationName: { type: String, required: true },
    dose: String,
    route: String,
    administeredAt: Date,
    administeredBy: { type: Schema.Types.ObjectId, ref: 'Account' },
    notes: String,
  },
  { _id: false }
);

const AnesthesiaRecordSchema = new Schema(
  {
    preAnestheticAssessment: String,

    anesthesiaType: {
      type: String,
      enum: Object.values(AnesthesiaType),
    },

    airwayManagement: String,
    airwayDevice: String,

    drugs: {
      type: [AnesthesiaDrugSchema],
      default: [],
    },

    oxygenVentilation: String,
    fluidBalanceMl: Number,
    bloodLossMl: Number,
    complications: String,
    recoveryAssessment: String,
    notes: String,
  },
  { _id: false }
);

const IntraopDocumentationSchema = new Schema(
  {
    procedureStartTime: Date,
    procedureEndTime: Date,
    incisionTime: Date,
    closureTime: Date,

    operativeDiagnosis: String,
    postOperativeDiagnosis: String,
    procedurePerformed: String,
    surgicalFindings: String,
    techniqueNotes: String,

    eblMl: { type: Number, default: 0 },
    fluidsAdministeredMl: { type: Number, default: 0 },

    bloodProductsAdministered: String,
    drainsInserted: String,

    implantsUsed: {
      type: [ImplantItemSchema],
      default: [],
    },

    specimensCollected: String,
    complications: String,
    surgeonNotes: String,
  },
  { _id: false }
);

const SurgeryCaseSchema = new Schema<ISurgeryCaseDocument>(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },

    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },

    procedureName: {
      type: String,
      required: true,
      trim: true,
    },

    icdCode: {
      type: String,
      trim: true,
    },

    theatreId: {
      type: String,
      required: true,
      index: true,
    },

    urgency: {
      type: String,
      enum: Object.values(UrgencyLevel),
      default: UrgencyLevel.ELECTIVE,
      required: true,
    },

    priority: {
      type: String,
      enum: Object.values(PriorityLevel),
      default: PriorityLevel.NORMAL,
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(SurgeryStatus),
      default: SurgeryStatus.SCHEDULED,
      required: true,
      index: true,
    },

    scheduledStartTime: {
      type: Date,
      required: true,
    },

    scheduledEndTime: {
      type: Date,
      required: true,
    },

    estimatedDurationMinutes: {
      type: Number,
      required: true,
    },

    actualStartTime: Date,
    actualEndTime: Date,

    leadSurgeonId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },

    surgicalTeam: {
      type: [SurgicalTeamMemberSchema],
      default: [],
    },

    anesthesiaType: {
      type: String,
      enum: Object.values(AnesthesiaType),
      required: true,
    },

    preOpAssessment: PreOpAssessmentSchema,

    consent: SurgicalConsentSchema,

    preOpMedications: {
      type: [PreOpMedicationSchema],
      default: [],
    },

    equipmentChecklist: {
      type: [EquipmentItemSchema],
      default: [],
    },

    instrumentChecklist: {
      type: [InstrumentItemSchema],
      default: [],
    },

    consumablesUsed: {
      type: [ConsumableItemSchema],
      default: [],
    },

    implantsUsed: {
      type: [ImplantItemSchema],
      default: [],
    },

    whoChecklist: {
      type: WHOChecklistSchema,
      default: () => ({
        signIn: { completed: false },
        timeOut: { completed: false },
        signOut: { completed: false },
      }),
    },

    vitalsTimeline: {
      type: [IntraopVitalsSchema],
      default: [],
    },

    anesthesiaRecord: AnesthesiaRecordSchema,

    intraopDocs: IntraopDocumentationSchema,

    postOpNotes: String,

    cancellationReason: String,

    postponementReason: String,
  },
  {
    timestamps: true,
  }
);

SurgeryCaseSchema.index({
  hospitalId: 1,
  theatreId: 1,
  scheduledStartTime: 1,
  scheduledEndTime: 1,
});

SurgeryCaseSchema.index({
  hospitalId: 1,
  leadSurgeonId: 1,
  scheduledStartTime: 1,
});

SurgeryCaseSchema.index({
  hospitalId: 1,
  status: 1,
  scheduledStartTime: 1,
});

export const SurgeryCaseModel = model<ISurgeryCaseDocument>(
  'SurgeryCase',
  SurgeryCaseSchema
);
