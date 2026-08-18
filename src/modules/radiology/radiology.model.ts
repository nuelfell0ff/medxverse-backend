import { Schema, model } from 'mongoose';

import {
  IRadiologyOrderDocument,
  ImagingModality,
  RadiologyOrderStatus,
  PriorityLevel,
  AssignmentRole,
  ExaminationQueueStatus,
  ReportStatus,
  CriticalResultStatus,
  PregnancyScreeningStatus,
  ContrastStatus,
  AIStudyPriority,
} from './radiology.types.js';

const PacsMetadataSchema = new Schema(
  {
    studyInstanceUid: { type: String, trim: true, index: true },
    seriesInstanceUid: { type: String, trim: true },
    accessionNumber: { type: String, trim: true, index: true },
    studyId: { type: String, trim: true },
    studyDate: { type: Date },
    imageCount: { type: Number, default: 0, min: 0 },
    seriesCount: { type: Number, default: 0, min: 0 },

    modality: {
      type: String,
      enum: Object.values(ImagingModality),
    },

    dicomViewerUrl: { type: String, trim: true },
    dicomFileKeys: [{ type: String, trim: true }],

    storageLocation: { type: String, trim: true },

    storageStatus: {
      type: String,
      enum: ['PENDING', 'STORED', 'ARCHIVED', 'FAILED'],
      default: 'PENDING',
    },

    keyImageIds: [{ type: String, trim: true }],

    priorStudyInstanceUids: [{ type: String, trim: true }],

    exportEnabled: {
      type: Boolean,
      default: false,
    },

    sharedLink: {
      type: String,
      trim: true,
    },

    sharedLinkExpiresAt: {
      type: Date,
    },
  },
  { _id: false }
);

const AssignmentSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    role: {
      type: String,
      enum: Object.values(AssignmentRole),
      required: true,
    },

    assignedAt: {
      type: Date,
      default: Date.now,
    },

    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const SchedulingSchema = new Schema(
  {
    scheduledDate: {
      type: Date,
      index: true,
    },

    scheduledStartTime: {
      type: String,
      trim: true,
    },

    scheduledEndTime: {
      type: String,
      trim: true,
    },

    estimatedDurationMinutes: {
      type: Number,
      min: 1,
    },

    modalityId: {
      type: Schema.Types.ObjectId,
      ref: 'Modality',
    },

    theatreOrRoom: {
      type: String,
      trim: true,
    },

    scheduledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: false }
);

const ProcedureTrackingSchema = new Schema(
  {
    queuedAt: Date,
    patientArrivedAt: Date,
    preparationStartedAt: Date,
    readyAt: Date,
    examinationStartedAt: Date,
    imageAcquisitionCompletedAt: Date,
    reportingStartedAt: Date,
    reportedAt: Date,
    completedAt: Date,
  },
  { _id: false }
);

const PatientPreparationSchema = new Schema(
  {
    instructions: {
      type: String,
      trim: true,
    },

    fastingRequired: {
      type: Boolean,
      default: false,
    },

    fastingHours: {
      type: Number,
      min: 0,
    },

    hydrationRequired: {
      type: Boolean,
      default: false,
    },

    medicationInstructions: {
      type: String,
      trim: true,
    },

    preparationCompleted: {
      type: Boolean,
      default: false,
    },

    preparationNotes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const ContrastSchema = new Schema(
  {
    status: {
      type: String,
      enum: Object.values(ContrastStatus),
      default: ContrastStatus.NOT_REQUIRED,
    },

    contrastName: {
      type: String,
      trim: true,
    },

    contrastType: {
      type: String,
      trim: true,
    },

    dose: Number,

    doseUnit: {
      type: String,
      trim: true,
    },

    route: {
      type: String,
      trim: true,
    },

    administeredAt: Date,

    administeredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    reactionObserved: {
      type: Boolean,
      default: false,
    },

    reactionDescription: {
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

const PregnancyScreeningSchema = new Schema(
  {
    status: {
      type: String,
      enum: Object.values(PregnancyScreeningStatus),
      default: PregnancyScreeningStatus.NOT_REQUIRED,
    },

    screenedAt: Date,

    screenedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    testType: {
      type: String,
      trim: true,
    },

    testResult: {
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

const RadiationExposureSchema = new Schema(
  {
    dose: Number,

    doseUnit: {
      type: String,
      trim: true,
    },

    doseAreaProduct: Number,

    doseAreaProductUnit: {
      type: String,
      trim: true,
    },

    ctDoseIndex: Number,

    doseLengthProduct: Number,

    recordedAt: Date,

    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const CriticalResultSchema = new Schema(
  {
    status: {
      type: String,
      enum: Object.values(CriticalResultStatus),
      default: CriticalResultStatus.NOT_APPLICABLE,
    },

    finding: {
      type: String,
      trim: true,
    },

    notifiedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    notifiedAt: Date,

    acknowledgedAt: Date,

    notificationMethod: {
      type: String,
      enum: ['PHONE', 'SMS', 'EMAIL', 'IN_APP'],
    },

    notificationNotes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const ReportVersionSchema = new Schema(
  {
    version: {
      type: Number,
      required: true,
    },

    findings: {
      type: String,
      required: true,
    },

    impression: {
      type: String,
      required: true,
    },

    radiologistNotes: String,

    status: {
      type: String,
      enum: Object.values(ReportStatus),
      required: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    signedAt: Date,
  },
  { _id: false }
);

const ReportSchema = new Schema(
  {
    status: {
      type: String,
      enum: Object.values(ReportStatus),
      default: ReportStatus.DRAFT,
    },

    findings: {
      type: String,
      trim: true,
    },

    impression: {
      type: String,
      trim: true,
    },

    radiologistNotes: {
      type: String,
      trim: true,
    },

    templateId: {
      type: String,
      trim: true,
    },

    version: {
      type: Number,
      default: 1,
    },

    draftedAt: Date,

    signedAt: Date,

    signedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    amendedAt: Date,

    amendmentReason: {
      type: String,
      trim: true,
    },

    criticalResult: {
      type: CriticalResultSchema,
      default: () => ({
        status: CriticalResultStatus.NOT_APPLICABLE,
      }),
    },

    versions: {
      type: [ReportVersionSchema],
      default: [],
    },
  },
  { _id: false }
);

const AIAnalysisSchema = new Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },

    modelName: String,

    modelVersion: String,

    processedAt: Date,

    priority: {
      type: String,
      enum: Object.values(AIStudyPriority),
      default: AIStudyPriority.NOT_PROCESSED,
    },

    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },

    findings: [String],

    measurements: {
      type: Map,
      of: Number,
    },

    recommendations: [String],

    qualityPassed: Boolean,

    qualityNotes: String,
  },
  { _id: false }
);

const RadiologyOrderSchema = new Schema<IRadiologyOrderDocument>(
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

    orderingDoctorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    radiologistId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    modality: {
      type: String,
      enum: Object.values(ImagingModality),
      required: true,
      index: true,
    },

    procedureName: {
      type: String,
      required: true,
      trim: true,
    },

    bodyPart: {
      type: String,
      required: true,
      trim: true,
    },

    clinicalIndication: {
      type: String,
      required: true,
      trim: true,
    },

    priority: {
      type: String,
      enum: Object.values(PriorityLevel),
      default: PriorityLevel.ROUTINE,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(RadiologyOrderStatus),
      default: RadiologyOrderStatus.REQUESTED,
      required: true,
      index: true,
    },

    accessionNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },

    scheduling: {
      type: SchedulingSchema,
    },

    assignments: {
      type: [AssignmentSchema],
      default: [],
    },

    procedureTracking: {
      type: ProcedureTrackingSchema,
      default: {},
    },

    patientPreparation: {
      type: PatientPreparationSchema,
    },

    contrast: {
      type: ContrastSchema,
    },

    pregnancyScreening: {
      type: PregnancyScreeningSchema,
    },

    radiationExposure: {
      type: RadiationExposureSchema,
    },

    pacsMetadata: {
      type: PacsMetadataSchema,
    },

    report: {
      type: ReportSchema,
    },

    // Legacy/report compatibility fields
    findings: {
      type: String,
      trim: true,
    },

    impression: {
      type: String,
      trim: true,
    },

    radiologistNotes: {
      type: String,
      trim: true,
    },

    reportedAt: Date,

    cancellationReason: {
      type: String,
      trim: true,
    },

    queuePosition: {
      type: Number,
      min: 1,
      index: true,
    },

    queueStatus: {
      type: String,
      enum: Object.values(ExaminationQueueStatus),
      default: ExaminationQueueStatus.WAITING,
      index: true,
    },

    aiAnalysis: {
      type: AIAnalysisSchema,
    },
  },
  {
    timestamps: true,
  }
);

RadiologyOrderSchema.index({
  hospitalId: 1,
  modality: 1,
  status: 1,
});

RadiologyOrderSchema.index({
  hospitalId: 1,
  priority: 1,
  queueStatus: 1,
});

RadiologyOrderSchema.index({
  hospitalId: 1,
  'scheduling.scheduledDate': 1,
});

RadiologyOrderSchema.index({
  hospitalId: 1,
  patientId: 1,
  createdAt: -1,
});

export const RadiologyOrderModel = model<IRadiologyOrderDocument>(
  'RadiologyOrder',
  RadiologyOrderSchema
);
