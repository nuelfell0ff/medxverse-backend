import mongoose, { Schema, model } from 'mongoose';
import { IClaimDocument } from './claims.types.js';

const ClaimItemSchema = new Schema(
  {
    code: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['PROCEDURE', 'DRUG', 'LAB_TEST', 'CONSULTATION', 'ACCOMMODATION', 'OTHER'],
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    claimedAmount: { type: Number, required: true, min: 0 },
    approvedAmount: {
      type: Number,
      min: 0,
      validate: {
        validator: function (this: any, value: number | undefined) {
          if (value === undefined || value === null) return true;
          return value <= this.claimedAmount;
        },
        message: 'Approved amount cannot exceed claimed amount',
      },
    },
  },
  { _id: false }
);

const ClaimSchema = new Schema<IClaimDocument>(
  {
    hmoId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    claimNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'HMSMember',
      required: true,
      index: true,
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
      index: true,
    },
    diagnosis: {
      type: String,
      required: true,
      trim: true,
    },
    icdCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    treatmentDate: {
      type: Date,
      required: true,
    },
    submissionDate: {
      type: Date,
      default: Date.now,
    },
    items: {
      type: [ClaimItemSchema],
      validate: {
        validator: (val: unknown[]) => Array.isArray(val) && val.length > 0,
        message: 'Claim must contain at least one item',
      },
    },
    totalClaimedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    totalApprovedAmount: {
      type: Number,
      min: 0,
      validate: {
        validator: function (this: IClaimDocument, value: number | undefined) {
          if (value === undefined || value === null) return true;
          return value <= this.totalClaimedAmount;
        },
        message: 'Total approved amount cannot exceed total claimed amount',
      },
    },
    status: {
      type: String,
      enum: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED'],
      default: 'SUBMITTED',
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    adjudicatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
    },
    adjudicatedAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

ClaimSchema.index({ hmoId: 1, claimNumber: 1 }, { unique: true });
ClaimSchema.index({ hmoId: 1, status: 1, createdAt: -1 });
ClaimSchema.index({ hmoId: 1, memberId: 1, createdAt: -1 });
ClaimSchema.index({ hmoId: 1, providerId: 1, createdAt: -1 });
ClaimSchema.index({ hmoId: 1, treatmentDate: -1 });

export const ClaimModel =
  mongoose.models.HMSClaim || model<IClaimDocument>('HMSClaim', ClaimSchema);
