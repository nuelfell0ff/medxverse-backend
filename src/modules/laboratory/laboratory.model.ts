import mongoose, { Schema } from 'mongoose';
import {
  ILabTestDocument,
  ILabRequestDocument,
  LabTestCategory,
  LabRequestStatus,
  LabPriority,
} from './laboratory.types.js';

// --- Lab Parameter Sub-Schema ---
const LabParameterSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    unit: { type: String, trim: true },
    referenceRange: { type: String, trim: true },
  },
  { _id: false }
);

// --- Lab Test Catalog Schema ---
const LabTestSchema = new Schema<ILabTestDocument>(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Hospital account ID is required'],
      index: true,
    },
    code: {
      type: String,
      required: [true, 'Test code is required'],
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Test name is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: Object.values(LabTestCategory),
      default: LabTestCategory.HAEMATOLOGY,
      index: true,
    },
    description: { type: String, trim: true },
    sampleType: {
      type: String,
      required: [true, 'Sample type is required (e.g., Blood, Urine)'],
      trim: true,
    },
    parameters: [LabParameterSchema],
    price: {
      type: Number,
      required: [true, 'Test price is required'],
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

LabTestSchema.index({ hospitalId: 1, code: 1 }, { unique: true });
LabTestSchema.index({ hospitalId: 1, name: 1 });

// --- Lab Result Value Sub-Schema ---
const LabResultValueSchema = new Schema(
  {
    parameterName: { type: String, required: true },
    value: { type: String, required: true },
    unit: { type: String },
    referenceRange: { type: String },
    isAbnormal: { type: Boolean, default: false },
  },
  { _id: false }
);

// --- Lab Request Item Sub-Schema ---
const LabRequestItemSchema = new Schema(
  {
    testId: {
      type: Schema.Types.ObjectId,
      ref: 'LabTest',
      required: true,
    },
    testName: { type: String, required: true },
    price: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(LabRequestStatus),
      default: LabRequestStatus.PENDING,
    },
    results: [LabResultValueSchema],
    remarks: { type: String, trim: true },
  },
  { _id: true }
);

// --- Lab Request Main Schema ---
const LabRequestSchema = new Schema<ILabRequestDocument>(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Hospital account ID is required'],
      index: true,
    },
    requestNumber: {
      type: String,
      required: true,
      unique: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient ID is required'],
      index: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: [true, 'Doctor ID is required'],
      index: true,
    },
    ipdAdmissionId: {
      type: Schema.Types.ObjectId,
      ref: 'IpdAdmission',
    },
    priority: {
      type: String,
      enum: Object.values(LabPriority),
      default: LabPriority.ROUTINE,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(LabRequestStatus),
      default: LabRequestStatus.PENDING,
      index: true,
    },
    sampleCollectedAt: { type: Date },
    sampleCollectedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
    sampleTypeNotes: { type: String, trim: true },
    items: [LabRequestItemSchema],
    totalAmount: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

LabRequestSchema.index({ hospitalId: 1, status: 1 });
LabRequestSchema.index({ hospitalId: 1, createdAt: -1 });

export const LabTest =
  mongoose.models.LabTest ||
  mongoose.model<ILabTestDocument>('LabTest', LabTestSchema);

export const LabRequest =
  mongoose.models.LabRequest ||
  mongoose.model<ILabRequestDocument>('LabRequest', LabRequestSchema);