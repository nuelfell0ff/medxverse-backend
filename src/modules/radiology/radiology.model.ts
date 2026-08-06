import { Schema, model } from 'mongoose';
import { IRadiologyRequest } from './radiology.types.js';

const radiologyRequestSchema = new Schema<IRadiologyRequest>(
  {
    hospitalId: { type: Schema.Types.ObjectId, required: true, ref: 'Hospital', index: true },
    patientId: { type: Schema.Types.ObjectId, required: true, ref: 'Patient', index: true },
    requestedBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    radiologistId: { type: Schema.Types.ObjectId, ref: 'User' },
    imagingType: {
      type: String,
      enum: ['X_RAY', 'MRI', 'CT_SCAN', 'ULTRASOUND', 'MAMMOGRAM'],
      required: true,
    },
    bodyPart: { type: String, required: true },
    clinicalIndication: { type: String, required: true },
    priority: {
      type: String,
      enum: ['ROUTINE', 'URGENT', 'EMERGENCY'],
      default: 'ROUTINE',
    },
    status: {
      type: String,
      enum: ['ORDERED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'ORDERED',
      index: true,
    },
    findings: { type: String },
    impression: { type: String },
    imageUrls: [{ type: String }],
    reportedAt: { type: Date },
  },
  { timestamps: true }
);

export const RadiologyRequestModel = model<IRadiologyRequest>('RadiologyRequest', radiologyRequestSchema);