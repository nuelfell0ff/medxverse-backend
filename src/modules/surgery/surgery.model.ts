import { Schema, model } from 'mongoose';

import {
  ISurgeryCaseDocument,
  SurgeryStatus,
  UrgencyLevel,
  SurgeryPriority,
  AnesthesiaType,
  SurgicalRole,
  ASAClassification,
  SterilizationStatus,
  MedicationTiming,
} from './surgery.types.js';

/**
 * ============================================================
 * SURGICAL TEAM
 * ============================================================
 */

const SurgicalTeamMemberSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },

    role: {
      type: String,
      enum: Object.values(SurgicalRole),
      required: true,
    },

    credentialVerified: {
      type: Boolean,
      default: false,
    },

    assignedAt: {
      type: Date,
      default: Date.now,
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

/**
 * ============================================================
 * PRE-OP ASSESSMENT
 * ============================================================
 */

const PreOpAssessmentSchema = new Schema(
  {
    diagnosis: {
      type: String,
      trim: true,
    },

    indicationForSurgery: {
      type: String,
      trim: true,
    },

    surgicalHistory: {
      type: String,
      trim: true,
    },

    medicalHistory: {
      type: String,
      trim: true,
    },

    allergies: {
      type: [String],
      default: [],
    },

    currentMedications: {
      type: [String],
      default: [],
    },

    laboratoryResults: {
      type: String,
      trim: true,
    },

    imagingResults: {
      type: String,
      trim: true,
    },

    anaestheticAssessment: {
      type: String,
      trim: true,
    },

    asaClassification: {
      type: String,
      enum: Object.values(ASAClassification),
    },

    mallampatiScore: {
      type: String,
      enum: [
        'CLASS_I',
        'CLASS_II',
        'CLASS_III',
        'CLASS_IV',
      ],
    },

    vteRiskScore: {
      type: String,
      trim: true,
    },

    infectionScreeningNotes: {
      type: String,
      trim: true,
    },

    pregnancyStatus: {
      type: String,
      enum: [
        'NOT_APPLICABLE',
        'NEGATIVE',
        'POSITIVE',
      ],
      default: 'NOT_APPLICABLE',
    },

    preOpVitals: {
      bpSystolic: Number,
      bpDiastolic: Number,
      heartRate: Number,
      respiratoryRate: Number,
      tempCelsius: Number,
      spO2: Number,
    },

    optimizationChecklist: {
      fastingConfirmed: {
        type: Boolean,
        default: false,
      },

      labsReviewed: {
        type: Boolean,
        default: false,
      },

      imagingReviewed: {
        type: Boolean,
        default: false,
      },

      bloodAvailable: {
        type: Boolean,
        default: false,
      },

      medicationsReviewed: {
        type: Boolean,
        default: false,
      },

      allergiesReviewed: {
        type: Boolean,
        default: false,
      },

      infectionScreeningCompleted: {
        type: Boolean,
        default: false,
      },

      anaesthesiaAssessmentCompleted: {
        type: Boolean,
        default: false,
      },
    },

    clearedForSurgery: {
      type: Boolean,
      default: false,
    },

    clearedAt: Date,

    clearedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

/**
 * ============================================================
 * CONSENT
 * ============================================================
 */

const ConsentVersionSchema = new Schema(
  {
    version: {
      type: Number,
      required: true,
    },

    procedureConsent: {
      type: Boolean,
      default: false,
    },

    anesthesiaConsent: {
      type: Boolean,
      default: false,
    },

    bloodTransfusionConsent: {
      type: Boolean,
      default: false,
    },

    highRiskConsent: {
      type: Boolean,
      default: false,
    },

    additionalProcedureConsent: {
      type: Boolean,
      default: false,
    },

    signedByPatient: {
      type: Boolean,
      default: false,
    },

    patientSignatureUrl: {
      type: String,
      trim: true,
    },

    witnessName: {
      type: String,
      trim: true,
    },

    witnessSignatureUrl: {
      type: String,
      trim: true,
    },

    signedAt: Date,

    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const SurgicalConsentSchema = new Schema(
  {
    procedureConsent: {
      type: Boolean,
      default: false,
    },

    anesthesiaConsent: {
      type: Boolean,
      default: false,
    },

    bloodTransfusionConsent: {
      type: Boolean,
      default: false,
    },

    highRiskConsent: {
      type: Boolean,
      default: false,
    },

    additionalProcedureConsent: {
      type: Boolean,
      default: false,
    },

    signedByPatient: {
      type: Boolean,
      default: false,
    },

    patientSignatureUrl: {
      type: String,
      trim: true,
    },

    witnessName: {
      type: String,
      trim: true,
    },

    witnessSignatureUrl: {
      type: String,
      trim: true,
    },

    signedAt: Date,

    currentVersion: {
      type: Number,
      default: 1,
    },

    versionHistory: {
      type: [ConsentVersionSchema],
      default: [],
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

/**
 * ============================================================
 * EQUIPMENT
 * ============================================================
 */

const EquipmentItemSchema = new Schema(
  {
    itemId: {
      type: String,
      trim: true,
    },

    itemName: {
      type: String,
      required: true,
      trim: true,
    },

    required: {
      type: Boolean,
      default: true,
    },

    available: {
      type: Boolean,
      default: false,
    },

    sterileStatus: {
      type: String,
      enum: Object.values(SterilizationStatus),
      default: SterilizationStatus.PENDING,
    },

    maintenanceOk: {
      type: Boolean,
      default: true,
    },

    sterilizationBatchId: {
      type: String,
      trim: true,
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

/**
 * ============================================================
 * CONSUMABLES
 * ============================================================
 */

const ConsumableItemSchema = new Schema(
  {
    itemId: {
      type: String,
      trim: true,
    },

    itemName: {
      type: String,
      required: true,
      trim: true,
    },

    quantityRequired: {
      type: Number,
      min: 0,
    },

    quantityUsed: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    unitCost: {
      type: Number,
      min: 0,
      default: 0,
    },

    lotNumber: {
      type: String,
      trim: true,
    },

    expiryDate: Date,

    stockDeducted: {
      type: Boolean,
      default: false,
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

/**
 * ============================================================
 * MEDICATION
 * ============================================================
 */

const SurgeryMedicationSchema = new Schema(
  {
    medicationName: {
      type: String,
      required: true,
      trim: true,
    },

    dose: {
      type: String,
      trim: true,
    },

    route: {
      type: String,
      trim: true,
    },

    frequency: {
      type: String,
      trim: true,
    },

    timing: {
      type: String,
      enum: Object.values(MedicationTiming),
      required: true,
    },

    administered: {
      type: Boolean,
      default: false,
    },

    administeredAt: Date,

    administeredBy: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: true }
);

/**
 * ============================================================
 * WHO CHECKLIST
 * ============================================================
 */

const WHOSignInSchema = new Schema(
  {
    completed: {
      type: Boolean,
      default: false,
    },

    completedAt: Date,

    completedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
    },

    patientIdentityConfirmed: {
      type: Boolean,
      default: false,
    },

    procedureConfirmed: {
      type: Boolean,
      default: false,
    },

    siteConfirmed: {
      type: Boolean,
      default: false,
    },

    consentVerified: {
      type: Boolean,
      default: false,
    },

    anesthesiaSafetyChecked: {
      type: Boolean,
      default: false,
    },

    pulseOximeterOn: {
      type: Boolean,
      default: false,
    },

    allergiesChecked: {
      type: Boolean,
      default: false,
    },

    airwayRisk: {
      type: Boolean,
      default: false,
    },

    bloodLossRiskOver500ml: {
      type: Boolean,
      default: false,
    },

    notes: String,
  },
  { _id: false }
);

const WHOTimeOutSchema = new Schema(
  {
    completed: {
      type: Boolean,
      default: false,
    },

    completedAt: Date,

    completedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
    },

    patientConfirmed: {
      type: Boolean,
      default: false,
    },

    procedureConfirmed: {
      type: Boolean,
      default: false,
    },

    surgicalSiteConfirmed: {
      type: Boolean,
      default: false,
    },

    teamIntroduced: {
      type: Boolean,
      default: false,
    },

    antibioticProphylaxisGiven: {
      type: Boolean,
      default: false,
    },

    imagingAvailable: {
      type: Boolean,
      default: false,
    },

    criticalConcernsSurgeon: String,

    criticalConcernsAnaesthetist: String,

    criticalConcernsNursing: String,

    notes: String,
  },
  { _id: false }
);

const WHOSignOutSchema = new Schema(
  {
    completed: {
      type: Boolean,
      default: false,
    },

    completedAt: Date,

    completedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
    },

    procedurePerformed: String,

    instrumentCount: Number,

    spongeCount: Number,

    needleCount: Number,

    countsCorrect: {
      type: Boolean,
      default: false,
    },

    specimenCollected: {
      type: Boolean,
      default: false,
    },

    specimenLabeled: {
      type: Boolean,
      default: false,
    },

    equipmentIssuesNoted: String,

    postOperativePlan: String,

    recoveryPlan: String,

    notes: String,
  },
  { _id: false }
);

const WHOChecklistSchema = new Schema(
  {
    signIn: {
      type: WHOSignInSchema,
      default: () => ({
        completed: false,
      }),
    },

    timeOut: {
      type: WHOTimeOutSchema,
      default: () => ({
        completed: false,
      }),
    },

    signOut: {
      type: WHOSignOutSchema,
      default: () => ({
        completed: false,
      }),
    },
  },
  { _id: false }
);

/**
 * ============================================================
 * VITALS
 * ============================================================
 */

const IntraopVitalsSchema = new Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
    },

    bpSystolic: Number,
    bpDiastolic: Number,

    heartRate: Number,

    spO2: Number,

    respRate: Number,

    tempCelsius: Number,

    etCO2: Number,

    ecgRhythm: String,

    oxygenFlow: String,

    ventilationMode: String,

    notes: String,
  },
  { _id: false }
);

/**
 * ============================================================
 * SPECIMENS
 * ============================================================
 */

const SpecimenSchema = new Schema(
  {
    specimenType: {
      type: String,
      required: true,
      trim: true,
    },

    description: String,

    containerLabel: String,

    sentToLaboratory: {
      type: Boolean,
      default: false,
    },

    sentAt: Date,

    notes: String,
  },
  { _id: false }
);

/**
 * ============================================================
 * INTRAOP DOCUMENTATION
 * ============================================================
 */

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

    estimatedBloodLossMl: {
      type: Number,
      min: 0,
      default: 0,
    },

    fluidsAdministeredMl: {
      type: Number,
      min: 0,
      default: 0,
    },

    bloodProductsAdministered: String,

    drainsInserted: String,

    implantsUsed: String,

    specimens: {
      type: [SpecimenSchema],
      default: [],
    },

    complications: String,

    surgeonNotes: String,

    notes: String,
  },
  { _id: false }
);

/**
 * ============================================================
 * ANAESTHESIA
 * ============================================================
 */

const AnesthesiaRecordSchema = new Schema(
  {
    preAnaestheticAssessment: String,

    anesthesiaType: {
      type: String,
      enum: Object.values(AnesthesiaType),
    },

    airwayManagement: String,

    airwayDevice: String,

    inductionDetails: String,

    maintenanceDetails: String,

    anestheticDrugs: {
      type: [SurgeryMedicationSchema],
      default: [],
    },

    monitoring: String,

    oxygenVentilationData: String,

    fluidsAdministeredMl: {
      type: Number,
      min: 0,
    },

    bloodLossMl: {
      type: Number,
      min: 0,
    },

    bloodProducts: String,

    complications: String,

    recoveryAssessment: String,

    notes: String,
  },
  { _id: false }
);

/**
 * ============================================================
 * RECOVERY
 * ============================================================
 */

const RecoveryAssessmentSchema = new Schema(
  {
    arrivalTime: Date,

    consciousnessLevel: String,

    airwayStatus: String,

    breathingStatus: String,

    circulationStatus: String,

    painScore: {
      type: Number,
      min: 0,
      max: 10,
    },

    nauseaVomiting: Boolean,

    recoveryNotes: String,

    dischargedFromRecovery: {
      type: Boolean,
      default: false,
    },

    dischargedAt: Date,

    dischargedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
    },
  },
  { _id: false }
);

/**
 * ============================================================
 * SURGERY CASE
 * ============================================================
 */

const SurgeryCaseSchema =
  new Schema<ISurgeryCaseDocument>(
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

      leadSurgeonId: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
        index: true,
      },

      theatreId: {
        type: String,
        required: true,
        trim: true,
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

      urgency: {
        type: String,
        enum: Object.values(UrgencyLevel),
        default: UrgencyLevel.ELECTIVE,
        required: true,
      },

      priority: {
        type: String,
        enum: Object.values(SurgeryPriority),
        default: SurgeryPriority.ROUTINE,
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
        index: true,
      },

      scheduledEndTime: {
        type: Date,
        required: true,
        index: true,
      },

      estimatedDurationMinutes: {
        type: Number,
        min: 1,
      },

      actualStartTime: Date,

      actualEndTime: Date,

      anesthesiaType: {
        type: String,
        enum: Object.values(AnesthesiaType),
        required: true,
      },

      surgicalTeam: {
        type: [SurgicalTeamMemberSchema],
        default: [],
      },

      preOpAssessment: {
        type: PreOpAssessmentSchema,
      },

      consent: {
        type: SurgicalConsentSchema,
      },

      preOpMedications: {
        type: [SurgeryMedicationSchema],
        default: [],
      },

      intraOpMedications: {
        type: [SurgeryMedicationSchema],
        default: [],
      },

      equipmentChecklist: {
        type: [EquipmentItemSchema],
        default: [],
      },

      consumablesUsed: {
        type: [ConsumableItemSchema],
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

      intraopDocs: {
        type: IntraopDocumentationSchema,
      },

      anesthesiaRecord: {
        type: AnesthesiaRecordSchema,
      },

      recoveryAssessment: {
        type: RecoveryAssessmentSchema,
      },

      cancellationReason: {
        type: String,
        trim: true,
      },

      postponedReason: {
        type: String,
        trim: true,
      },

      rescheduledFrom: Date,

      rescheduledAt: Date,

      rescheduledBy: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
      },

      createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
      },

      updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
      },
    },
    {
      timestamps: true,
    }
  );

/**
 * ============================================================
 * INDEXES
 * ============================================================
 */

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

SurgeryCaseSchema.index({
  hospitalId: 1,
  urgency: 1,
  priority: 1,
});

/**
 * ============================================================
 * MODEL
 * ============================================================
 */

export const SurgeryCaseModel =
  model<ISurgeryCaseDocument>(
    'SurgeryCase',
    SurgeryCaseSchema
  );
