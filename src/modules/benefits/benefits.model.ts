import { Schema, model } from 'mongoose';
import {
  BenefitCategory,
  IBenefitPackageDocument,
  PackageStatus,
} from './benefits.types.js';

const BenefitRuleSchema = new Schema(
  {
    category: {
      type: String,
      enum: Object.values(BenefitCategory),
      required: true,
    },
    isCovered: { type: Boolean, required: true, default: true },
    annualLimit: { type: Number, min: 0 },
    perVisitLimit: { type: Number, min: 0 },
    copayPercentage: { type: Number, min: 0, max: 100, default: 0 },
    copayAmount: { type: Number, min: 0, default: 0 },
    requiresPreAuth: { type: Boolean, default: false },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { _id: false }
);

const BenefitPackageSchema = new Schema<IBenefitPackageDocument>(
  {
    hmoId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Account',
      index: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },
    description: { type: String, trim: true, maxlength: 2000 },
    tier: { type: String, trim: true, maxlength: 100 },
    annualMaxBenefit: { type: Number, min: 0 },
    status: {
      type: String,
      enum: Object.values(PackageStatus),
      default: PackageStatus.DRAFT,
      index: true,
    },
    rules: {
      type: [BenefitRuleSchema],
      default: [],
      validate: {
        validator: (rules: unknown[]) => Array.isArray(rules),
        message: 'Rules must be an array',
      },
    },
  },
  { timestamps: true }
);

BenefitPackageSchema.index({ hmoId: 1, code: 1 }, { unique: true });
BenefitPackageSchema.index({ hmoId: 1, status: 1, createdAt: -1 });
BenefitPackageSchema.index({ hmoId: 1, tier: 1, createdAt: -1 });

export const BenefitPackageModel = model<IBenefitPackageDocument>(
  'BenefitPackage',
  BenefitPackageSchema
);
