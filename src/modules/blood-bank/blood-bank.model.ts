import { Schema, model } from 'mongoose';
import {
  IBloodUnitDocument,
  ITransfusionRequestDocument,
  BloodGroup,
  BloodComponentType,
  BloodUnitStatus,
  TransfusionRequestStatus,
  TransfusionUrgency,
  CrossmatchResult,
} from './blood-bank.types.js';

const BloodUnitSchema = new Schema<IBloodUnitDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    donorId: { type: Schema.Types.ObjectId, ref: 'User' },
    donorCode: { type: String, trim: true },
    unitNumber: { type: String, required: true, trim: true, unique: true },
    bloodGroup: {
      type: String,
      enum: Object.values(BloodGroup),
      required: true,
      index: true,
    },
    componentType: {
      type: String,
      enum: Object.values(BloodComponentType),
      required: true,
      index: true,
    },
    volumeMl: { type: Number, required: true, min: 1 },
    collectionDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: Object.values(BloodUnitStatus),
      default: BloodUnitStatus.AVAILABLE,
      required: true,
      index: true,
    },
    storageLocation: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

BloodUnitSchema.index({ hospitalId: 1, bloodGroup: 1, componentType: 1, status: 1 });

export const BloodUnitModel = model<IBloodUnitDocument>('BloodUnit', BloodUnitSchema);

const TransfusionRequestSchema = new Schema<ITransfusionRequestDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    requestedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bloodGroup: {
      type: String,
      enum: Object.values(BloodGroup),
      required: true,
      index: true,
    },
    componentType: {
      type: String,
      enum: Object.values(BloodComponentType),
      required: true,
      index: true,
    },
    unitsRequested: { type: Number, required: true, min: 1 },
    urgency: {
      type: String,
      enum: Object.values(TransfusionUrgency),
      default: TransfusionUrgency.ROUTINE,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(TransfusionRequestStatus),
      default: TransfusionRequestStatus.PENDING,
      required: true,
      index: true,
    },
    crossmatchResult: {
      type: String,
      enum: Object.values(CrossmatchResult),
      default: CrossmatchResult.NOT_DONE,
      required: true,
    },
    assignedUnitIds: [{ type: Schema.Types.ObjectId, ref: 'BloodUnit' }],
    clinicalIndication: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

TransfusionRequestSchema.index({ hospitalId: 1, status: 1, urgency: 1 });

export const TransfusionRequestModel = model<ITransfusionRequestDocument>(
  'TransfusionRequest',
  TransfusionRequestSchema
);