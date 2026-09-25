import mongoose, { Schema, Types } from 'mongoose';

export interface IAnalyticsReport {
  hmoId: Types.ObjectId;
  reportNumber: string;
  type: string;
  format: 'JSON' | 'CSV';
  status: 'GENERATED' | 'FAILED';
  periodFrom: Date;
  periodTo: Date;
  generatedBy?: Types.ObjectId;
  parameters?: Record<string, unknown>;
  payload?: unknown;
  csv?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAnalyticsAuditLog {
  hmoId: Types.ObjectId;
  actorId?: Types.ObjectId;
  action: string;
  resource: string;
  resourceId?: string;
  success: boolean;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface IAnalyticsConsent {
  hmoId: Types.ObjectId;
  subjectType: 'MEMBER' | 'PROVIDER' | 'USER';
  subjectId: Types.ObjectId;
  purpose: string;
  version: string;
  status: 'GRANTED' | 'REVOKED' | 'EXPIRED';
  source?: string;
  grantedAt?: Date;
  revokedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IComplianceReport {
  hmoId: Types.ObjectId;
  reportNumber: string;
  type: string;
  periodFrom: Date;
  periodTo: Date;
  status: 'DRAFT' | 'READY' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  generatedBy?: Types.ObjectId;
  submittedAt?: Date;
  submittedBy?: Types.ObjectId;
  findings: Array<Record<string, unknown>>;
  metrics: Record<string, unknown>;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generic key/value object schema.
 *
 * Using Mixed for individual values allows analytics metadata
 * and compliance findings to contain flexible data while still
 * giving Mongoose an explicit array/object schema to work with.
 */
const DynamicObjectSchema = new Schema<Record<string, unknown>>(
  {},
  {
    _id: false,
    strict: false,
  },
);

const ReportSchema = new Schema<IAnalyticsReport>(
  {
    hmoId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },

    reportNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    type: {
      type: String,
      required: true,
      index: true,
    },

    format: {
      type: String,
      enum: ['JSON', 'CSV'],
      required: true,
    },

    status: {
      type: String,
      enum: ['GENERATED', 'FAILED'],
      required: true,
      index: true,
    },

    periodFrom: {
      type: Date,
      required: true,
      index: true,
    },

    periodTo: {
      type: Date,
      required: true,
      index: true,
    },

    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
    },

    parameters: {
      type: Schema.Types.Mixed,
    },

    payload: {
      type: Schema.Types.Mixed,
    },

    csv: String,

    error: String,
  },
  {
    timestamps: true,
  },
);

ReportSchema.index({
  hmoId: 1,
  type: 1,
  createdAt: -1,
});

const AuditSchema = new Schema<IAnalyticsAuditLog>(
  {
    hmoId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },

    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      index: true,
    },

    action: {
      type: String,
      required: true,
      index: true,
    },

    resource: {
      type: String,
      required: true,
      index: true,
    },

    resourceId: String,

    success: {
      type: Boolean,
      default: true,
      index: true,
    },

    ip: String,

    userAgent: String,

    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  },
);

AuditSchema.index({
  hmoId: 1,
  createdAt: -1,
});

AuditSchema.index({
  hmoId: 1,
  resource: 1,
  action: 1,
  createdAt: -1,
});

const ConsentSchema = new Schema<IAnalyticsConsent>(
  {
    hmoId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },

    subjectType: {
      type: String,
      enum: ['MEMBER', 'PROVIDER', 'USER'],
      required: true,
    },

    subjectId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    purpose: {
      type: String,
      required: true,
      trim: true,
    },

    version: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ['GRANTED', 'REVOKED', 'EXPIRED'],
      default: 'GRANTED',
      index: true,
    },

    source: String,

    grantedAt: Date,

    revokedAt: Date,

    expiresAt: Date,
  },
  {
    timestamps: true,
  },
);

ConsentSchema.index(
  {
    hmoId: 1,
    subjectType: 1,
    subjectId: 1,
    purpose: 1,
  },
  {
    unique: true,
  },
);

const ComplianceSchema = new Schema<IComplianceReport>(
  {
    hmoId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },

    reportNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    type: {
      type: String,
      required: true,
      index: true,
    },

    periodFrom: {
      type: Date,
      required: true,
    },

    periodTo: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: [
        'DRAFT',
        'READY',
        'SUBMITTED',
        'ACCEPTED',
        'REJECTED',
      ],
      default: 'DRAFT',
      index: true,
    },

    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
    },

    submittedAt: Date,

    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
    },

    findings: {
      type: [DynamicObjectSchema],
      default: [],
    },

    metrics: {
      type: Schema.Types.Mixed,
      default: {},
    },

    notes: String,
  },
  {
    timestamps: true,
  },
);

ComplianceSchema.index({
  hmoId: 1,
  type: 1,
  periodFrom: -1,
});

export const AnalyticsReportModel =
  mongoose.models.HMOAnalyticsReport ||
  mongoose.model<IAnalyticsReport>(
    'HMOAnalyticsReport',
    ReportSchema,
  );

export const AnalyticsAuditLogModel =
  mongoose.models.HMOAnalyticsAuditLog ||
  mongoose.model<IAnalyticsAuditLog>(
    'HMOAnalyticsAuditLog',
    AuditSchema,
  );

export const AnalyticsConsentModel =
  mongoose.models.HMOAnalyticsConsent ||
  mongoose.model<IAnalyticsConsent>(
    'HMOAnalyticsConsent',
    ConsentSchema,
  );

export const ComplianceReportModel =
  mongoose.models.HMOComplianceReport ||
  mongoose.model<IComplianceReport>(
    'HMOComplianceReport',
    ComplianceSchema,
  );