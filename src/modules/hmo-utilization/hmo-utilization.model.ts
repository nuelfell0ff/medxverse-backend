import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import {
  AlertStatus,
  FraudCaseStatus,
  FraudEntityType,
  RiskSeverity,
  RuleOperator,
  UtilizationEventType,
  UtilizationSourceType,
} from './hmo-utilization.types.js';

export interface IUtilizationEvent extends Document {
  hmoId: Types.ObjectId;
  memberId: Types.ObjectId;
  providerId?: Types.ObjectId;
  claimId?: Types.ObjectId;
  preAuthorizationId?: Types.ObjectId;
  serviceCode?: string;
  serviceName?: string;
  category: UtilizationEventType;
  sourceType: UtilizationSourceType;
  serviceDate: Date;
  quantity: number;
  amount: number;
  diagnosisCodes: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFraudRule extends Document {
  hmoId: Types.ObjectId;
  code: string;
  name: string;
  description?: string;
  category: string;
  entityType: FraudEntityType;
  severity: RiskSeverity;
  enabled: boolean;
  threshold: number;
  operator: RuleOperator;
  windowDays: number;
  action: 'ALERT' | 'CASE';
  createdAt: Date;
  updatedAt: Date;
}

export interface IFraudAlert extends Document {
  hmoId: Types.ObjectId;
  ruleId: Types.ObjectId;
  status: AlertStatus;
  severity: RiskSeverity;
  title: string;
  description?: string;
  entityType: FraudEntityType;
  memberId?: Types.ObjectId;
  providerId?: Types.ObjectId;
  claimIds: Types.ObjectId[];
  evidence: Record<string, unknown>;
  score: number;
  reviewedBy?: Types.ObjectId;
  reviewNote?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFraudCase extends Document {
  hmoId: Types.ObjectId;
  alertId?: Types.ObjectId;
  caseNumber: string;
  title: string;
  description?: string;
  status: FraudCaseStatus;
  severity: RiskSeverity;
  entityType: FraudEntityType;
  memberId?: Types.ObjectId;
  providerId?: Types.ObjectId;
  claimIds: Types.ObjectId[];
  estimatedLoss: number;
  recoveredAmount: number;
  assignedTo?: Types.ObjectId;
  finding?: string;
  notes?: string;
  openedAt: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const baseTimestamps = true;

const UtilizationEventSchema = new Schema<IUtilizationEvent>(
  {
    hmoId: { type: Schema.Types.ObjectId, required: true, index: true },
    memberId: { type: Schema.Types.ObjectId, required: true, index: true },
    providerId: { type: Schema.Types.ObjectId, index: true },
    claimId: { type: Schema.Types.ObjectId, index: true },
    preAuthorizationId: { type: Schema.Types.ObjectId, index: true },
    serviceCode: { type: String, trim: true, index: true },
    serviceName: { type: String, trim: true },
    category: { type: String, enum: Object.values(UtilizationEventType), required: true, index: true },
    sourceType: { type: String, enum: Object.values(UtilizationSourceType), required: true, index: true },
    serviceDate: { type: Date, required: true, index: true },
    quantity: { type: Number, default: 1, min: 0 },
    amount: { type: Number, default: 0, min: 0 },
    diagnosisCodes: { type: [String], default: [] },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: baseTimestamps },
);

UtilizationEventSchema.index({ hmoId: 1, memberId: 1, serviceDate: -1 });
UtilizationEventSchema.index({ hmoId: 1, providerId: 1, serviceDate: -1 });
UtilizationEventSchema.index({ hmoId: 1, category: 1, serviceDate: -1 });

const FraudRuleSchema = new Schema<IFraudRule>(
  {
    hmoId: { type: Schema.Types.ObjectId, required: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    entityType: { type: String, enum: Object.values(FraudEntityType), default: FraudEntityType.MULTIPLE },
    severity: { type: String, enum: Object.values(RiskSeverity), default: RiskSeverity.MEDIUM },
    enabled: { type: Boolean, default: true, index: true },
    threshold: { type: Number, default: 0, min: 0 },
    operator: { type: String, enum: Object.values(RuleOperator), default: RuleOperator.GTE },
    windowDays: { type: Number, default: 30, min: 1, max: 365 },
    action: { type: String, enum: ['ALERT', 'CASE'], default: 'ALERT' },
  },
  { timestamps: baseTimestamps },
);
FraudRuleSchema.index({ hmoId: 1, code: 1 }, { unique: true });

const FraudAlertSchema = new Schema<IFraudAlert>(
  {
    hmoId: { type: Schema.Types.ObjectId, required: true, index: true },
    ruleId: { type: Schema.Types.ObjectId, required: true, index: true },
    status: { type: String, enum: Object.values(AlertStatus), default: AlertStatus.OPEN, index: true },
    severity: { type: String, enum: Object.values(RiskSeverity), required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    entityType: { type: String, enum: Object.values(FraudEntityType), required: true, index: true },
    memberId: { type: Schema.Types.ObjectId, index: true },
    providerId: { type: Schema.Types.ObjectId, index: true },
    claimIds: { type: [Schema.Types.ObjectId], default: [] },
    evidence: { type: Schema.Types.Mixed, default: {} },
    score: { type: Number, default: 0, min: 0, max: 100 },
    reviewedBy: { type: Schema.Types.ObjectId },
    reviewNote: { type: String, trim: true },
    reviewedAt: { type: Date },
  },
  { timestamps: baseTimestamps },
);
FraudAlertSchema.index({ hmoId: 1, status: 1, createdAt: -1 });

const FraudCaseSchema = new Schema<IFraudCase>(
  {
    hmoId: { type: Schema.Types.ObjectId, required: true, index: true },
    alertId: { type: Schema.Types.ObjectId, index: true },
    caseNumber: { type: String, required: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: Object.values(FraudCaseStatus), default: FraudCaseStatus.OPEN, index: true },
    severity: { type: String, enum: Object.values(RiskSeverity), required: true, index: true },
    entityType: { type: String, enum: Object.values(FraudEntityType), required: true },
    memberId: { type: Schema.Types.ObjectId, index: true },
    providerId: { type: Schema.Types.ObjectId, index: true },
    claimIds: { type: [Schema.Types.ObjectId], default: [] },
    estimatedLoss: { type: Number, default: 0, min: 0 },
    recoveredAmount: { type: Number, default: 0, min: 0 },
    assignedTo: { type: Schema.Types.ObjectId },
    finding: { type: String, trim: true },
    notes: { type: String, trim: true },
    openedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
  },
  { timestamps: baseTimestamps },
);
FraudCaseSchema.index({ hmoId: 1, caseNumber: 1 }, { unique: true });

export const UtilizationEventModel: Model<IUtilizationEvent> =
  mongoose.models.HMOUtilizationEvent ||
  mongoose.model<IUtilizationEvent>('HMOUtilizationEvent', UtilizationEventSchema);

export const FraudRuleModel: Model<IFraudRule> =
  mongoose.models.HMOFraudRule ||
  mongoose.model<IFraudRule>('HMOFraudRule', FraudRuleSchema);

export const FraudAlertModel: Model<IFraudAlert> =
  mongoose.models.HMOFraudAlert ||
  mongoose.model<IFraudAlert>('HMOFraudAlert', FraudAlertSchema);

export const FraudCaseModel: Model<IFraudCase> =
  mongoose.models.HMOFraudCase ||
  mongoose.model<IFraudCase>('HMOFraudCase', FraudCaseSchema);
