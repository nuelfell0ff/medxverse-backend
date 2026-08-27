import mongoose, { Model, Schema, Types } from 'mongoose';

import {
  BillingAccountStatus,
  BillingSourceModule,
  ChargeCategory,
  ChargeStatus,
  PaymentMethod,
  PaymentPlanFrequency,
  PaymentPlanStatus,
  PaymentStatus,
  ReconciliationStatus,
  RefundStatus,
} from './billing.types.js';

/* =========================================================
   BILLING ACCOUNT
========================================================= */

export interface IBillingAccount {
  _id?: Types.ObjectId;
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  billingId: string;
  accountName?: string;
  status: BillingAccountStatus;
  notes?: string;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const BillingAccountSchema = new Schema<IBillingAccount>(
  {
    hospitalId: { type: Schema.Types.ObjectId, required: true, index: true },
    patientId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Patient',
      index: true,
    },
    billingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
      trim: true,
    },
    accountName: { type: String, trim: true },
    status: {
      type: String,
      enum: Object.values(BillingAccountStatus),
      default: BillingAccountStatus.ACTIVE,
      index: true,
    },
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
  },
  { timestamps: true }
);

BillingAccountSchema.index({ hospitalId: 1, patientId: 1 }, { unique: true });

export const BillingAccountModel: Model<IBillingAccount> =
  mongoose.models.BillingAccount ||
  mongoose.model<IBillingAccount>('BillingAccount', BillingAccountSchema);

/* =========================================================
   PRICING CATALOGUE
   One current catalogue record contains its price history.
========================================================= */

export interface IPricingHistory {
  version: number;
  price: number;
  currency: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  changedAt: Date;
  changedBy?: Types.ObjectId;
  reason?: string;
}

export interface IPricingCatalogueItem {
  _id?: Types.ObjectId;
  hospitalId: Types.ObjectId;
  code: string;
  name: string;
  /** Human-friendly pricing plan name shown to clinical modules. */
  planName?: string;
  category: ChargeCategory;

  departmentId?: Types.ObjectId;
  departmentName?: string;

  price: number;
  currency: string;

  version: number;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  isActive: boolean;

  description?: string;

  history: IPricingHistory[];

  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const PricingHistorySchema = new Schema<IPricingHistory>(
  {
    version: { type: Number, required: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true },
    effectiveFrom: Date,
    effectiveTo: Date,
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
    reason: { type: String, trim: true },
  },
  { _id: false }
);

const PricingCatalogueSchema = new Schema<IPricingCatalogueItem>(
  {
    hospitalId: { type: Schema.Types.ObjectId, required: true, index: true },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    planName: { type: String, trim: true, index: true },
    category: {
      type: String,
      enum: Object.values(ChargeCategory),
      required: true,
      index: true,
    },

    departmentId: { type: Schema.Types.ObjectId, index: true },
    departmentName: { type: String, trim: true },

    price: { type: Number, required: true, min: 0 },
    currency: {
      type: String,
      default: 'NGN',
      uppercase: true,
      trim: true,
    },

    version: { type: Number, default: 1, min: 1 },
    effectiveFrom: Date,
    effectiveTo: Date,
    isActive: { type: Boolean, default: true, index: true },

    description: { type: String, trim: true },

    history: {
      type: [PricingHistorySchema],
      default: [],
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
  },
  { timestamps: true }
);

PricingCatalogueSchema.index({
  hospitalId: 1,
  departmentId: 1,
  code: 1,
  planName: 1,
  isActive: 1,
});

PricingCatalogueSchema.index({
  hospitalId: 1,
  departmentName: 1,
  code: 1,
  planName: 1,
  isActive: 1,
});

export const PricingCatalogueModel: Model<IPricingCatalogueItem> =
  mongoose.models.PricingCatalogue ||
  mongoose.model<IPricingCatalogueItem>(
    'PricingCatalogue',
    PricingCatalogueSchema
  );

/* =========================================================
   CHARGES
========================================================= */

export interface ICharge {
  _id?: Types.ObjectId;

  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  billingAccountId: Types.ObjectId;

  catalogueItemId?: Types.ObjectId;
  cataloguePlanName?: string;
  serviceCode?: string;

  description: string;
  category: ChargeCategory;

  sourceModule: BillingSourceModule;
  sourceId?: Types.ObjectId;

  departmentId?: Types.ObjectId;
  departmentName?: string;

  quantity: number;

  /**
   * Catalogue price at the moment of charging.
   */
  cataloguePrice?: number;

  catalogueVersion?: number;

  /**
   * Actual price used for this transaction.
   * This can differ from cataloguePrice only when an override is applied.
   */
  unitPrice: number;

  overrideApplied: boolean;
  overrideReason?: string;

  currency: string;

  grossAmount: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  amountPaid: number;

  status: ChargeStatus;

  notes?: string;

  chargedBy?: Types.ObjectId;
  chargeDate: Date;

  voidedAt?: Date;
  voidedBy?: Types.ObjectId;
  voidReason?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

const ChargeSchema = new Schema<ICharge>(
  {
    hospitalId: { type: Schema.Types.ObjectId, required: true, index: true },
    patientId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Patient',
      index: true,
    },
    billingAccountId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'BillingAccount',
      index: true,
    },

    catalogueItemId: {
      type: Schema.Types.ObjectId,
      ref: 'PricingCatalogue',
    },
    cataloguePlanName: { type: String, trim: true },
    serviceCode: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
    },

    description: { type: String, required: true, trim: true },

    category: {
      type: String,
      enum: Object.values(ChargeCategory),
      required: true,
      index: true,
    },

    sourceModule: {
      type: String,
      enum: Object.values(BillingSourceModule),
      default: BillingSourceModule.MANUAL,
      index: true,
    },
    sourceId: { type: Schema.Types.ObjectId, index: true },

    departmentId: { type: Schema.Types.ObjectId },
    departmentName: { type: String, trim: true },

    quantity: { type: Number, min: 0.01, default: 1 },

    cataloguePrice: { type: Number, min: 0 },
    catalogueVersion: { type: Number, min: 1 },

    unitPrice: { type: Number, required: true, min: 0 },

    overrideApplied: { type: Boolean, default: false },
    overrideReason: { type: String, trim: true },

    currency: { type: String, default: 'NGN', uppercase: true },

    grossAmount: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, min: 0, default: 0 },
    taxAmount: { type: Number, min: 0, default: 0 },
    netAmount: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, min: 0, default: 0 },

    status: {
      type: String,
      enum: Object.values(ChargeStatus),
      default: ChargeStatus.POSTED,
      index: true,
    },

    notes: String,

    chargedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
    chargeDate: { type: Date, default: Date.now, index: true },

    voidedAt: Date,
    voidedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
    voidReason: String,
  },
  { timestamps: true }
);

ChargeSchema.index({ hospitalId: 1, patientId: 1, chargeDate: -1 });
ChargeSchema.index({ sourceModule: 1, sourceId: 1 });

export const ChargeModel: Model<ICharge> =
  mongoose.models.BillingCharge ||
  mongoose.model<ICharge>('BillingCharge', ChargeSchema);

/* =========================================================
   PAYMENTS / RECEIPTS
========================================================= */

export interface IPayment {
  _id?: Types.ObjectId;
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  billingAccountId: Types.ObjectId;

  receiptNumber: string;

  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;

  reference?: string;
  provider?: string;
  providerTransactionId?: string;
  notes?: string;

  receivedBy?: Types.ObjectId;
  paidAt: Date;

  reconciliationStatus: ReconciliationStatus;
  reconciledBy?: Types.ObjectId;
  reconciledAt?: Date;
  reconciliationReference?: string;
  reconciliationNotes?: string;

  refundedAmount: number;

  createdAt?: Date;
  updatedAt?: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    hospitalId: { type: Schema.Types.ObjectId, required: true, index: true },
    patientId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Patient',
      index: true,
    },
    billingAccountId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'BillingAccount',
      index: true,
    },

    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
    },

    amount: { type: Number, required: true, min: 0.01 },
    method: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.CONFIRMED,
      index: true,
    },

    reference: { type: String, trim: true, index: true },
    provider: { type: String, trim: true },
    providerTransactionId: { type: String, trim: true, index: true },
    notes: String,

    receivedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
    paidAt: { type: Date, default: Date.now, index: true },

    reconciliationStatus: {
      type: String,
      enum: Object.values(ReconciliationStatus),
      default: ReconciliationStatus.UNRECONCILED,
      index: true,
    },

    reconciledBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
    reconciledAt: Date,
    reconciliationReference: String,
    reconciliationNotes: String,

    refundedAmount: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true }
);

export const PaymentModel: Model<IPayment> =
  mongoose.models.BillingPayment ||
  mongoose.model<IPayment>('BillingPayment', PaymentSchema);

/* =========================================================
   REFUNDS
========================================================= */

export interface IRefund {
  _id?: Types.ObjectId;
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  billingAccountId: Types.ObjectId;
  paymentId: Types.ObjectId;

  amount: number;
  reason: string;

  status: RefundStatus;

  requestedBy?: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;

  completedAt?: Date;
  rejectedReason?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

const RefundSchema = new Schema<IRefund>(
  {
    hospitalId: { type: Schema.Types.ObjectId, required: true, index: true },
    patientId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Patient',
      index: true,
    },
    billingAccountId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'BillingAccount',
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'BillingPayment',
    },

    amount: { type: Number, required: true, min: 0.01 },
    reason: { type: String, required: true, trim: true },

    status: {
      type: String,
      enum: Object.values(RefundStatus),
      default: RefundStatus.PENDING,
      index: true,
    },

    requestedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
    approvedAt: Date,

    completedAt: Date,
    rejectedReason: String,
  },
  { timestamps: true }
);

export const RefundModel: Model<IRefund> =
  mongoose.models.BillingRefund ||
  mongoose.model<IRefund>('BillingRefund', RefundSchema);

/* =========================================================
   PAYMENT PLANS
========================================================= */

export interface IPaymentPlanInstallment {
  _id?: Types.ObjectId;
  dueDate: Date;
  amount: number;
  paidAmount: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  paidAt?: Date;
}

export interface IPaymentPlan {
  _id?: Types.ObjectId;

  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  billingAccountId: Types.ObjectId;

  totalAmount: number;
  installmentAmount: number;
  frequency: PaymentPlanFrequency;

  startDate: Date;
  endDate?: Date;

  status: PaymentPlanStatus;

  installments: IPaymentPlanInstallment[];

  notes?: string;
  createdBy?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

const InstallmentSchema = new Schema<IPaymentPlanInstallment>(
  {
    dueDate: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'],
      default: 'PENDING',
    },
    paidAt: Date,
  },
  { _id: true }
);

const PaymentPlanSchema = new Schema<IPaymentPlan>(
  {
    hospitalId: { type: Schema.Types.ObjectId, required: true, index: true },
    patientId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Patient',
      index: true,
    },
    billingAccountId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'BillingAccount',
      index: true,
    },

    totalAmount: { type: Number, required: true, min: 0.01 },
    installmentAmount: { type: Number, required: true, min: 0.01 },

    frequency: {
      type: String,
      enum: Object.values(PaymentPlanFrequency),
      required: true,
    },

    startDate: { type: Date, required: true },
    endDate: Date,

    status: {
      type: String,
      enum: Object.values(PaymentPlanStatus),
      default: PaymentPlanStatus.ACTIVE,
      index: true,
    },

    installments: {
      type: [InstallmentSchema],
      default: [],
    },

    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
  },
  { timestamps: true }
);

export const PaymentPlanModel: Model<IPaymentPlan> =
  mongoose.models.PaymentPlan ||
  mongoose.model<IPaymentPlan>('PaymentPlan', PaymentPlanSchema);