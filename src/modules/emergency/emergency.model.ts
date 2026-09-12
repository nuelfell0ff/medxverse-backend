import mongoose, { Schema, model } from 'mongoose';
import {
  IEDVisitDocument,
  ITriageAssessmentDocument,
  IEDBayDocument,
  IBayAssignmentDocument,
  IEDOrderDocument,
  IDispositionRecordDocument,
  EDVisitStatus,
  TriageScale,
  ArrivalMode,
  AcuityLevel,
  TraumaType,
  BayAssignmentStatus,
  EDBayStatus,
  EDOrderType,
  EDOrderStatus,
  DispositionType,
  WorkflowStatus,
} from './emergency.types.js';

const VitalsSchema = new Schema(
  {
    heartRateBpm: Number,
    systolicBpMmHg: Number,
    diastolicBpMmHg: Number,
    respiratoryRateBpm: Number,
    oxygenSaturationPct: Number,
    temperatureCelsius: Number,
    glasgowComaScale: Number,
    painScale: Number,
    bloodGlucoseMmolL: Number,
  },
  { _id: false }
);

const ResourceNeedsSchema = new Schema(
  {
    resuscitation: { type: Boolean, default: false },
    cardiacMonitor: { type: Boolean, default: false },
    oxygen: { type: Boolean, default: false },
    isolation: { type: Boolean, default: false },
    negativePressure: { type: Boolean, default: false },
    bariatric: { type: Boolean, default: false },
    pediatric: { type: Boolean, default: false },
    mentalHealthSafeSpace: { type: Boolean, default: false },
  },
  { _id: false }
);

const StatusTransitionSchema = new Schema(
  {
    from: { type: String, enum: Object.values(EDVisitStatus) },
    to: { type: String, enum: Object.values(EDVisitStatus), required: true },
    changedAt: { type: Date, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: String,
  },
  { _id: false }
);

const DownstreamWorkflowSchema = new Schema(
  {
    workflow: {
      type: String,
      enum: ['BED_MANAGEMENT', 'DISCHARGE_PLANNING', 'REFERRAL'],
      required: true,
    },
    status: { type: String, enum: Object.values(WorkflowStatus), required: true },
    triggeredAt: Date,
    completedAt: Date,
    referenceId: String,
    errorMessage: String,
  },
  { _id: false }
);

const EDVisitSchema = new Schema<IEDVisitDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', index: true },
    visitNumber: { type: String, required: true, trim: true },
    isUnidentified: { type: Boolean, default: false, index: true },
    temporaryIdentifier: { type: String, trim: true },
    arrivalAt: { type: Date, required: true, default: Date.now, index: true },
    arrivalMode: { type: String, enum: Object.values(ArrivalMode), required: true },
    chiefComplaint: { type: String, required: true, trim: true },
    traumaType: { type: String, enum: Object.values(TraumaType), default: TraumaType.NONE },
    status: { type: String, enum: Object.values(EDVisitStatus), required: true, index: true },
    currentAcuityLevel: { type: Number, enum: Object.values(AcuityLevel), index: true },
    currentTriageAssessmentId: { type: Schema.Types.ObjectId, ref: 'TriageAssessment' },
    currentBayAssignmentId: { type: Schema.Types.ObjectId, ref: 'BayAssignment' },
    attendingClinicianId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    resourceNeeds: { type: ResourceNeedsSchema, default: () => ({}) },
    priorityScore: { type: Number, default: 0, index: true },
    statusTransitions: { type: [StatusTransitionSchema], default: [] },
    downstreamWorkflows: { type: [DownstreamWorkflowSchema], default: [] },
    notes: { type: String, trim: true },
    closedAt: Date,
  },
  { timestamps: true }
);

EDVisitSchema.index({ hospitalId: 1, status: 1, currentAcuityLevel: 1, priorityScore: -1 });
EDVisitSchema.index({ hospitalId: 1, arrivalAt: 1 });
EDVisitSchema.index({ hospitalId: 1, visitNumber: 1 }, { unique: true });

const TriageAssessmentSchema = new Schema<ITriageAssessmentDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    visitId: { type: Schema.Types.ObjectId, ref: 'EDVisit', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', index: true },
    scale: { type: String, enum: Object.values(TriageScale), required: true },
    acuityLevel: { type: Number, enum: Object.values(AcuityLevel), required: true, index: true },
    chiefComplaint: { type: String, required: true, trim: true },
    vitals: VitalsSchema,
    resourceNeeds: { type: ResourceNeedsSchema, default: () => ({}) },
    assessedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assessedAt: { type: Date, required: true, default: Date.now, index: true },
    isReassessment: { type: Boolean, default: false },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

TriageAssessmentSchema.index({ hospitalId: 1, visitId: 1, assessedAt: -1 });

const EDBaySchema = new Schema<IEDBayDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    bayCode: { type: String, required: true, trim: true },
    name: { type: String, trim: true },
    zone: { type: String, trim: true, index: true },
    status: { type: String, enum: Object.values(EDBayStatus), default: EDBayStatus.AVAILABLE, index: true },
    supportedAcuityLevels: { type: [Number], default: [1, 2, 3, 4, 5] },
    resourceCapabilities: { type: ResourceNeedsSchema, default: () => ({}) },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

EDBaySchema.index({ hospitalId: 1, bayCode: 1 }, { unique: true });

const BayAssignmentSchema = new Schema<IBayAssignmentDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    visitId: { type: Schema.Types.ObjectId, ref: 'EDVisit', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', index: true },
    bayId: { type: Schema.Types.ObjectId, ref: 'EDBay' },
    bayCode: { type: String, required: true, trim: true, index: true },
    assignedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedAt: { type: Date, required: true, default: Date.now },
    releasedAt: Date,
    status: { type: String, enum: Object.values(BayAssignmentStatus), default: BayAssignmentStatus.ASSIGNED, index: true },
    reason: { type: String, trim: true },
  },
  { timestamps: true }
);

BayAssignmentSchema.index({ hospitalId: 1, bayCode: 1, status: 1 });
BayAssignmentSchema.index({ hospitalId: 1, visitId: 1, assignedAt: -1 });

const EDOrderSchema = new Schema<IEDOrderDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    visitId: { type: Schema.Types.ObjectId, ref: 'EDVisit', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', index: true },
    type: { type: String, enum: Object.values(EDOrderType), required: true, index: true },
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: Object.values(EDOrderStatus), default: EDOrderStatus.ORDERED, index: true },
    sourceSystem: { type: String, trim: true },
    sourceRecordId: { type: String, trim: true },
    orderedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderedAt: { type: Date, default: Date.now, index: true },
    startedAt: Date,
    completedAt: Date,
    resultSummary: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

EDOrderSchema.index({ hospitalId: 1, visitId: 1, status: 1 });

const DispositionRecordSchema = new Schema<IDispositionRecordDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    visitId: { type: Schema.Types.ObjectId, ref: 'EDVisit', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', index: true },
    disposition: { type: String, enum: Object.values(DispositionType), required: true },
    decidedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    decidedAt: { type: Date, default: Date.now },
    notes: { type: String, trim: true },
    wardId: { type: Schema.Types.ObjectId, ref: 'Ward' },
    transferFacility: { type: String, trim: true },
    workflowStatus: { type: String, enum: Object.values(WorkflowStatus), default: WorkflowStatus.TRIGGERED },
    workflowReferenceId: { type: String, trim: true },
    workflowError: { type: String, trim: true },
  },
  { timestamps: true }
);

DispositionRecordSchema.index({ hospitalId: 1, visitId: 1, decidedAt: -1 });

export const EDVisitModel = mongoose.models.EDVisit || model<IEDVisitDocument>('EDVisit', EDVisitSchema);
export const TriageAssessmentModel =
  mongoose.models.TriageAssessment || model<ITriageAssessmentDocument>('TriageAssessment', TriageAssessmentSchema);
export const EDBayModel = mongoose.models.EDBay || model<IEDBayDocument>('EDBay', EDBaySchema);
export const BayAssignmentModel =
  mongoose.models.BayAssignment || model<IBayAssignmentDocument>('BayAssignment', BayAssignmentSchema);
export const EDOrderModel = mongoose.models.EDOrder || model<IEDOrderDocument>('EDOrder', EDOrderSchema);
export const DispositionRecordModel =
  mongoose.models.DispositionRecord || model<IDispositionRecordDocument>('DispositionRecord', DispositionRecordSchema);
