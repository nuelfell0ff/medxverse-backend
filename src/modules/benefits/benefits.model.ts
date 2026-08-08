import { Schema, model } from 'mongoose';
import { BenefitCategory, IBenefitPackageDocument, PackageStatus } from './benefits.types.js';

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
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const BenefitPackageSchema = new Schema<IBenefitPackageDocument>(
  {
    hmoId: { type: Schema.Types.ObjectId, required: true, ref: 'HMO', index: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    tier: { type: String, trim: true },
    annualMaxBenefit: { type: Number, min: 0 },
    status: {
      type: String,
      enum: Object.values(PackageStatus),
      default: PackageStatus.DRAFT,
    },
    rules: { type: [BenefitRuleSchema], default: [] },
  },
  { timestamps: true }
);

BenefitPackageSchema.index({ hmoId: 1, code: 1 }, { unique: true });
BenefitPackageSchema.index({ name: 'text', code: 'text' });

export const BenefitPackageModel = model<IBenefitPackageDocument>(
  'BenefitPackage',
  BenefitPackageSchema
);