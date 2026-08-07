import { Schema, model } from 'mongoose';
import {
  ILabOrderDocument,
  LabOrderStatus,
  LabPriority,
  ResultFlag,
} from './lab.types.js';

const LabResultFieldSchema = new Schema(
  {
    parameterName: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    unit: { type: String, trim: true },
    referenceRange: { type: String, trim: true },
    flag: {
      type: String,
      enum: Object.values(ResultFlag),
      default: ResultFlag.NORMAL,
    },
  },
  { _id: false }
);

const LabOrderSchema = new Schema<ILabOrderDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    consultationId: { type: Schema.Types.ObjectId, ref: 'Consultation', index: true },
    testName: { type: String, required: true, trim: true },
    testCategory: { type: String, required: true, trim: true, index: true },
    priority: {
      type: String,
      enum: Object.values(LabPriority),
      default: LabPriority.ROUTINE,
    },
    status: {
      type: String,
      enum: Object.values(LabOrderStatus),
      default: LabOrderStatus.PENDING,
      index: true,
    },
    sampleType: { type: String, trim: true },
    notes: { type: String, trim: true },
    results: { type: [LabResultFieldSchema], default: [] },
    labTechnicianId: { type: Schema.Types.ObjectId, ref: 'User' },
    sampleCollectedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export const LabOrderModel = model<ILabOrderDocument>('LabOrder', LabOrderSchema);