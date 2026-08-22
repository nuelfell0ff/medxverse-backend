import { Schema, model } from 'mongoose';
import {
  ILabOrderDocument,
  ITestCatalogDocument,
  LabOrderStatus,
  LabPriority,
  LabDepartment,
  ResultFlag,
  SpecimenQuality,
  EntryMethod,
} from './lab.types.js';

const LabResultFieldSchema = new Schema(
  {
    parameterName: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    unit: { type: String, trim: true },
    referenceRange: { type: String, trim: true },
    ageSexSpecificRange: { type: String, trim: true },
    flag: {
      type: String,
      enum: Object.values(ResultFlag),
      default: ResultFlag.NORMAL,
    },
    previousValue: { type: String, trim: true },
    deltaPercentage: { type: Number },
    entryMethod: {
      type: String,
      enum: Object.values(EntryMethod),
      default: EntryMethod.MANUAL,
    },
  },
  { _id: false }
);

const ChainOfCustodySchema = new Schema(
  {
    timestamp: { type: Date, default: Date.now },
    action: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    location: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const SpecimenRejectionSchema = new Schema(
  {
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    quality: { type: String, enum: Object.values(SpecimenQuality), required: true },
    rejectionDate: { type: Date, default: Date.now },
    recollectionRequested: { type: Boolean, default: true },
  },
  { _id: false }
);

const LabOrderSchema = new Schema<ILabOrderDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    consultationId: { type: Schema.Types.ObjectId, ref: 'Consultation', index: true },
    accessionNumber: { type: String, required: true, unique: true, index: true },
    barcodeUrl: { type: String },

    testCatalogId: { type: Schema.Types.ObjectId, ref: 'TestCatalog' },
    testName: { type: String, required: true, trim: true },
    testCategory: {
      type: String,
      enum: Object.values(LabDepartment),
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(LabPriority),
      default: LabPriority.ROUTINE,
      index: true,
    },
    isStat: { type: Boolean, default: false, index: true },
    status: {
      type: String,
      enum: Object.values(LabOrderStatus),
      default: LabOrderStatus.PENDING,
      index: true,
    },

    sampleType: { type: String, required: true, trim: true },
    sampleCollectionScheduledAt: { type: Date },
    sampleCollectedAt: { type: Date },
    phlebotomistId: { type: Schema.Types.ObjectId, ref: 'User' },
    specimenQuality: { type: String, enum: Object.values(SpecimenQuality) },
    chainOfCustody: { type: [ChainOfCustodySchema], default: [] },
    rejectionInfo: { type: SpecimenRejectionSchema },

    results: { type: [LabResultFieldSchema], default: [] },
    labTechnicianId: { type: Schema.Types.ObjectId, ref: 'User' },
    verifierId: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    completedAt: { type: Date },
    version: { type: Number, default: 1 },
    amendmentHistory: { type: [Schema.Types.Mixed], default: [] },

    aiPatternAlerts: { type: [String], default: [] },
    deltaCheckTriggered: { type: Boolean, default: false },
    criticalResultNotified: { type: Boolean, default: false },
    predictedTatMinutes: { type: Number },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// Test Catalog Schema
const TestCatalogSchema = new Schema<ITestCatalogDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    department: { type: String, enum: Object.values(LabDepartment), required: true },
    sampleType: { type: String, required: true },
    parameters: [
      {
        name: { type: String, required: true },
        unit: { type: String },
        defaultRefRange: { type: String },
        criticalLow: { type: Number },
        criticalHigh: { type: Number },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const LabOrderModel = model<ILabOrderDocument>('LabOrder', LabOrderSchema);
export const TestCatalogModel = model<ITestCatalogDocument>('TestCatalog', TestCatalogSchema);