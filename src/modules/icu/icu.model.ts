import mongoose, { Schema, model } from 'mongoose';
import {
  IICUAdmissionDocument,
  IDeviceReadingDocument,
  IFlowsheetEntryDocument,
  IICUScoreDocument,
  IFamilyCommunicationLogDocument,
  CareLevel,
  ICUCaseStatus,
  VentilatorMode,
  ICUDeviceType,
  DeviceProtocol,
  ReadingQuality,
  FlowEntrySource,
  ICUScoreType,
  ICUScoreStatus,
} from './icu.types.js';

const VentilatorSettingsSchema = new Schema(
  {
    mode: { type: String, enum: Object.values(VentilatorMode), default: VentilatorMode.NONE, required: true },
    fio2Pct: { type: Number, min: 21, max: 100 },
    peepCmH2O: { type: Number, min: 0, max: 60 },
    tidalVolumeMl: { type: Number, min: 0, max: 3000 },
    respiratoryRate: { type: Number, min: 0, max: 100 },
    pressureSupportCmH2O: { type: Number, min: 0, max: 60 },
    inspiratoryPressureCmH2O: { type: Number, min: 0, max: 60 },
    minuteVentilationL: { type: Number, min: 0, max: 100 },
    isIntubated: { type: Boolean, default: false },
  },
  { _id: false },
);

const ICUVitalsSchema = new Schema(
  {
    heartRateBpm: { type: Number, min: 0, max: 300 },
    systolicBpMmHg: { type: Number, min: 0, max: 300 },
    diastolicBpMmHg: { type: Number, min: 0, max: 200 },
    meanArterialPressureMmHg: { type: Number, min: 0, max: 250 },
    respiratoryRateBpm: { type: Number, min: 0, max: 100 },
    oxygenSaturationPct: { type: Number, min: 0, max: 100 },
    temperatureCelsius: { type: Number, min: 20, max: 45 },
    centralVenousPressureMmHg: { type: Number, min: -10, max: 50 },
    intracranialPressureMmHg: { type: Number, min: 0, max: 100 },
    glasgowComaScale: { type: Number, min: 3, max: 15 },
  },
  { _id: false },
);

const ICUAdmissionSchema = new Schema<IICUAdmissionDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    wardId: { type: Schema.Types.ObjectId, ref: 'Ward', required: true, index: true },
    bedNumber: { type: String, required: true, trim: true, index: true },
    careLevel: { type: String, enum: Object.values(CareLevel), default: CareLevel.LEVEL_2_ICU, required: true, index: true },
    primaryDiagnosis: { type: String, required: true, trim: true },
    admissionReason: { type: String, required: true, trim: true },
    attendingPhysicianId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    admittedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vitals: { type: ICUVitalsSchema },
    ventilatorSettings: { type: VentilatorSettingsSchema },
    status: { type: String, enum: Object.values(ICUCaseStatus), default: ICUCaseStatus.ADMITTED, required: true, index: true },
    transferredToWardId: { type: Schema.Types.ObjectId, ref: 'Ward' },
    dispositionNotes: { type: String, trim: true },
    sourceSurgeryCaseId: { type: Schema.Types.ObjectId, ref: 'SurgeryCase', index: true },
    encounterId: { type: Schema.Types.ObjectId, index: true },
    admittedAt: { type: Date, default: Date.now, required: true, index: true },
    dischargedAt: { type: Date },
  },
  { timestamps: true },
);

ICUAdmissionSchema.index({ hospitalId: 1, status: 1, bedNumber: 1 });
ICUAdmissionSchema.index({ hospitalId: 1, wardId: 1, status: 1 });
ICUAdmissionSchema.index(
  { hospitalId: 1, bedNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: [ICUCaseStatus.ADMITTED, ICUCaseStatus.STABILIZED] },
    },
  },
);
ICUAdmissionSchema.index(
  { hospitalId: 1, patientId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: [ICUCaseStatus.ADMITTED, ICUCaseStatus.STABILIZED] },
    },
  },
);

const DeviceMeasurementSchema = new Schema(
  {
    parameter: { type: String, required: true, trim: true },
    value: { type: Schema.Types.Mixed, required: true },
    unit: { type: String, trim: true },
    referenceCode: { type: String, trim: true },
  },
  { _id: false },
);

const DeviceReadingSchema = new Schema<IDeviceReadingDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    admissionId: { type: Schema.Types.ObjectId, ref: 'ICUAdmission', required: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    deviceId: { type: String, required: true, trim: true },
    deviceType: { type: String, enum: Object.values(ICUDeviceType), required: true },
    manufacturer: { type: String, trim: true },
    model: { type: String, trim: true },
    protocol: { type: String, enum: Object.values(DeviceProtocol), required: true },
    measurements: { type: [DeviceMeasurementSchema], required: true, default: [] },
    quality: { type: String, enum: Object.values(ReadingQuality), default: ReadingQuality.VALID, required: true },
    recordedAt: { type: Date, required: true, index: true },
    receivedAt: { type: Date, default: Date.now, required: true },
    sourceSequence: { type: String, trim: true },
    rawPayloadHash: { type: String, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timeseries: {
      timeField: 'recordedAt',
      metaField: 'metadata',
      granularity: 'seconds',
    },
  },
);

DeviceReadingSchema.index({ 'metadata.hospitalId': 1, 'metadata.admissionId': 1, recordedAt: -1 });
DeviceReadingSchema.index({ 'metadata.hospitalId': 1, deviceId: 1, recordedAt: -1 });

const FlowsheetEntrySchema = new Schema<IFlowsheetEntryDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    admissionId: { type: Schema.Types.ObjectId, ref: 'ICUAdmission', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    recordedAt: { type: Date, required: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
    parameter: { type: String, required: true, trim: true },
    value: { type: Schema.Types.Mixed, required: true },
    unit: { type: String, trim: true },
    source: { type: String, enum: Object.values(FlowEntrySource), default: FlowEntrySource.DEVICE, required: true },
    sourceDeviceReadingId: { type: Schema.Types.ObjectId, ref: 'DeviceReading' },
    enteredById: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedById: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    annotation: { type: String, trim: true },
    status: { type: String, enum: ['PENDING_REVIEW', 'CONFIRMED', 'AMENDED'], default: 'PENDING_REVIEW', required: true },
  },
  { timestamps: true },
);

FlowsheetEntrySchema.index({ hospitalId: 1, admissionId: 1, recordedAt: -1 });
FlowsheetEntrySchema.index({ hospitalId: 1, admissionId: 1, parameter: 1, recordedAt: -1 });

const ICUScoreComponentSchema = new Schema(
  {
    name: { type: String, required: true },
    value: Number,
    points: Number,
    unit: String,
    source: String,
    missing: Boolean,
  },
  { _id: false },
);

const ICUScoreSchema = new Schema<IICUScoreDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    admissionId: { type: Schema.Types.ObjectId, ref: 'ICUAdmission', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    scoreType: { type: String, enum: Object.values(ICUScoreType), required: true },
    score: { type: Number, required: true, min: 0 },
    status: { type: String, enum: Object.values(ICUScoreStatus), required: true },
    calculatedAt: { type: Date, default: Date.now, required: true, index: true },
    windowStart: Date,
    windowEnd: Date,
    components: { type: [ICUScoreComponentSchema], default: [] },
    inputs: { type: Schema.Types.Mixed, default: {} },
    calculationVersion: { type: String, required: true },
  },
  { timestamps: true },
);

ICUScoreSchema.index({ hospitalId: 1, admissionId: 1, scoreType: 1, calculatedAt: -1 });

const FamilyCommunicationLogSchema = new Schema<IFamilyCommunicationLogDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    admissionId: { type: Schema.Types.ObjectId, ref: 'ICUAdmission', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    communicatedAt: { type: Date, default: Date.now, required: true, index: true },
    communicatedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    contactName: { type: String, required: true, trim: true },
    relationship: { type: String, trim: true },
    contactMethod: { type: String, enum: ['IN_PERSON', 'PHONE', 'VIDEO', 'OTHER'], required: true },
    topics: { type: [String], default: [] },
    summary: { type: String, required: true, trim: true },
    questionsOrConcerns: { type: String, trim: true },
    followUpRequired: { type: Boolean, default: false },
    followUpPlan: { type: String, trim: true },
  },
  { timestamps: true },
);

FamilyCommunicationLogSchema.index({ hospitalId: 1, admissionId: 1, communicatedAt: -1 });

export const ICUAdmissionModel =
  mongoose.models.ICUAdmission || model<IICUAdmissionDocument>('ICUAdmission', ICUAdmissionSchema);
export const DeviceReadingModel =
  mongoose.models.DeviceReading || model<IDeviceReadingDocument>('DeviceReading', DeviceReadingSchema);
export const FlowsheetEntryModel =
  mongoose.models.FlowsheetEntry || model<IFlowsheetEntryDocument>('FlowsheetEntry', FlowsheetEntrySchema);
export const ICUScoreModel =
  mongoose.models.ICUScore || model<IICUScoreDocument>('ICUScore', ICUScoreSchema);
export const FamilyCommunicationLogModel =
  mongoose.models.FamilyCommunicationLog ||
  model<IFamilyCommunicationLogDocument>('FamilyCommunicationLog', FamilyCommunicationLogSchema);
