import mongoose, { Schema, model } from 'mongoose';
import {
  BenefitCategory,
  BenefitStatus,
  HealthPlanStatus,
  HealthPlanType,
  PremiumFrequency,
  IBenefitDefinitionDocument,
  IHealthPlanDocument,
  IPlanBenefitDocument,
  IBenefitRule,
  IPlanPremium,
} from './health-plans.types.js';

const benefitRuleSchema = new Schema<IBenefitRule>(
  {
    covered: { type: Boolean, default: true },
    coveredServices: { type: [String], default: [] },
    annualLimitAmount: { type: Number, min: 0 },
    annualUtilizationLimit: { type: Number, min: 0 },
    perVisitLimitAmount: { type: Number, min: 0 },
    copayPercentage: { type: Number, min: 0, max: 100, default: 0 },
    copayAmount: { type: Number, min: 0 },
    deductibleAmount: { type: Number, min: 0 },
    waitingPeriodDays: { type: Number, min: 0, max: 3650, default: 0 },
    requiresPreAuth: { type: Boolean, default: false },
    exclusions: { type: [String], default: [] },
    notes: { type: String, trim: true, maxlength: 4000 },
  },
  { _id: false }
);

const premiumSchema = new Schema<IPlanPremium>(
  {
    individual: { type: Number, min: 0 },
    family: { type: Number, min: 0 },
    corporate: { type: Number, min: 0 },
    currency: { type: String, required: true, trim: true, uppercase: true, maxlength: 10 },
    frequency: { type: String, enum: Object.values(PremiumFrequency), required: true },
  },
  { _id: false }
);

const benefitDefinitionSchema = new Schema<IBenefitDefinitionDocument>(
  {
    hmoId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true, minlength: 2, maxlength: 60 },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 180 },
    description: { type: String, trim: true, maxlength: 4000 },
    category: { type: String, enum: Object.values(BenefitCategory), required: true, index: true },
    status: { type: String, enum: Object.values(BenefitStatus), default: BenefitStatus.DRAFT, index: true },
    defaultRule: { type: benefitRuleSchema, required: true },
  },
  { timestamps: true }
);

benefitDefinitionSchema.index({ hmoId: 1, code: 1 }, { unique: true });
benefitDefinitionSchema.index({ hmoId: 1, category: 1, status: 1 });
benefitDefinitionSchema.index({ hmoId: 1, name: 1 });

const healthPlanSchema = new Schema<IHealthPlanDocument>(
  {
    hmoId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true, minlength: 2, maxlength: 60 },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 180 },
    description: { type: String, trim: true, maxlength: 4000 },
    type: { type: String, enum: Object.values(HealthPlanType), required: true, index: true },
    status: { type: String, enum: Object.values(HealthPlanStatus), default: HealthPlanStatus.DRAFT, index: true },
    tier: { type: String, trim: true, maxlength: 100, index: true },
    currency: { type: String, trim: true, uppercase: true, maxlength: 10, default: 'NGN', required: true },
    premium: { type: premiumSchema },
    defaultWaitingPeriodDays: { type: Number, min: 0, max: 3650, default: 0 },
    annualUtilizationLimit: { type: Number, min: 0 },
    effectiveFrom: { type: Date, required: true, index: true },
    effectiveTo: { type: Date },
    benefitIds: { type: [Schema.Types.ObjectId], ref: 'BenefitDefinition', default: [] },
    notes: { type: String, trim: true, maxlength: 4000 },
  },
  { timestamps: true }
);

healthPlanSchema.index({ hmoId: 1, code: 1 }, { unique: true });
healthPlanSchema.index({ hmoId: 1, status: 1, type: 1 });
healthPlanSchema.index({ hmoId: 1, effectiveFrom: 1, effectiveTo: 1 });
healthPlanSchema.index({ hmoId: 1, name: 1 });

const planBenefitSchema = new Schema<IPlanBenefitDocument>(
  {
    hmoId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    healthPlanId: { type: Schema.Types.ObjectId, ref: 'HealthPlan', required: true, index: true },
    benefitId: { type: Schema.Types.ObjectId, ref: 'BenefitDefinition', required: true, index: true },
    rule: { type: benefitRuleSchema, required: true },
  },
  { timestamps: true }
);

planBenefitSchema.index({ hmoId: 1, healthPlanId: 1, benefitId: 1 }, { unique: true });
planBenefitSchema.index({ hmoId: 1, healthPlanId: 1, createdAt: -1 });

export const BenefitDefinitionModel =
  mongoose.models.BenefitDefinition || model<IBenefitDefinitionDocument>('BenefitDefinition', benefitDefinitionSchema);

export const HealthPlanModel =
  mongoose.models.HealthPlan || model<IHealthPlanDocument>('HealthPlan', healthPlanSchema);

export const PlanBenefitModel =
  mongoose.models.PlanBenefit || model<IPlanBenefitDocument>('PlanBenefit', planBenefitSchema);
