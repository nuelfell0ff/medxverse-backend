import { Schema, model } from 'mongoose';
import {
  IHMOProviderDocument,
  IHMOPreAuthDocument,
  IHMOClaimDocument,
} from './hmo.types.js';

const hmoProviderSchema = new Schema<IHMOProviderDocument>(
  {
    name: {
      type: String,
      required: [true, 'HMO Provider name is required'],
      trim: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'HMO Provider email is required'],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, 'HMO Provider phone number is required'],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    contactPerson: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
    },
    portalUrl: {
      type: String,
      trim: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

hmoProviderSchema.index({ name: 'text', code: 'text' });

export const HMOProvider = model<IHMOProviderDocument>('HMOProvider', hmoProviderSchema);

const hmoPreAuthSchema = new Schema<IHMOPreAuthDocument>(
  {
    authCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    hmoProviderId: {
      type: Schema.Types.ObjectId,
      ref: 'HMOProvider',
      required: [true, 'HMO Provider ID is required'],
      index: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient ID is required'],
      index: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Requesting user ID is required'],
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    diagnosisCode: {
      type: String,
      trim: true,
    },
    diagnosisDescription: {
      type: String,
      required: [true, 'Diagnosis description is required'],
      trim: true,
    },
    requestedServices: [
      {
        serviceName: { type: String, required: true },
        type: {
          type: String,
          enum: ['CONSULTATION', 'LAB_TEST', 'MEDICATION', 'PROCEDURE', 'ACCOMMODATION', 'OTHER'],
          required: true,
        },
        estimatedCost: { type: Number, required: true, min: 0 },
      },
    ],
    totalEstimatedCost: {
      type: Number,
      required: true,
      min: 0,
    },
    approvedAmount: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'],
      default: 'PENDING',
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    validUntil: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const HMOPreAuth = model<IHMOPreAuthDocument>('HMOPreAuth', hmoPreAuthSchema);

const claimItemSchema = new Schema(
  {
    serviceName: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['CONSULTATION', 'LAB_TEST', 'MEDICATION', 'PROCEDURE', 'ACCOMMODATION', 'OTHER'],
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    approvedPrice: { type: Number, min: 0 },
  },
  { _id: true }
);

const hmoClaimSchema = new Schema<IHMOClaimDocument>(
  {
    claimNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    hmoProviderId: {
      type: Schema.Types.ObjectId,
      ref: 'HMOProvider',
      required: [true, 'HMO Provider ID is required'],
      index: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient ID is required'],
      index: true,
    },
    policyNumber: {
      type: String,
      required: [true, 'Patient HMO Policy Number is required'],
      trim: true,
      index: true,
    },
    preAuthCode: {
      type: String,
      uppercase: true,
      trim: true,
      index: true,
    },
    opdVisitId: {
      type: Schema.Types.ObjectId,
      ref: 'OPDVisit',
      index: true,
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Submitting user ID is required'],
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    items: {
      type: [claimItemSchema],
      required: true,
    },
    totalClaimAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    approvedAmount: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED'],
      default: 'SUBMITTED',
      index: true,
    },
    submissionDate: {
      type: Date,
      default: Date.now,
    },
    adjudicationDate: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const HMOClaim = model<IHMOClaimDocument>('HMOClaim', hmoClaimSchema);