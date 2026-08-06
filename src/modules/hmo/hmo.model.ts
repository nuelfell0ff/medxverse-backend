import { Schema, model } from 'mongoose';
import { IHmoClaim, IHmoPreAuth } from './hmo.types.js';

const claimItemSchema = new Schema({
  description: { type: String, required: true },
  code: { type: String, required: true },
  cost: { type: Number, required: true },
});

const hmoClaimSchema = new Schema<IHmoClaim>(
  {
    hospitalId: { type: Schema.Types.ObjectId, required: true, ref: 'Hospital', index: true },
    patientId: { type: Schema.Types.ObjectId, required: true, ref: 'Patient', index: true },
    hmoProviderId: { type: Schema.Types.ObjectId, required: true, ref: 'HmoProvider' },
    policyNumber: { type: String, required: true },
    claimAmount: { type: Number, required: true },
    approvedAmount: { type: Number, default: 0 },
    diagnosisCode: { type: String, required: true },
    items: [claimItemSchema],
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'DISPUTED'],
      default: 'PENDING',
      index: true,
    },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

const hmoPreAuthSchema = new Schema<IHmoPreAuth>(
  {
    hospitalId: { type: Schema.Types.ObjectId, required: true, ref: 'Hospital', index: true },
    patientId: { type: Schema.Types.ObjectId, required: true, ref: 'Patient' },
    hmoProviderId: { type: Schema.Types.ObjectId, required: true, ref: 'HmoProvider' },
    procedureCode: { type: String, required: true },
    estimatedCost: { type: Number, required: true },
    clinicalNotes: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'DENIED'],
      default: 'PENDING',
    },
    authCode: { type: String },
  },
  { timestamps: true }
);

export const HmoClaimModel = model<IHmoClaim>('HmoClaim', hmoClaimSchema);
export const HmoPreAuthModel = model<IHmoPreAuth>('HmoPreAuth', hmoPreAuthSchema);