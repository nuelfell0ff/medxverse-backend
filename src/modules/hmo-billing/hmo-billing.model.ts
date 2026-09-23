import mongoose, { HydratedDocument, Model, Schema } from 'mongoose';
import {
  IInvoiceDocument,
  IInvoiceLine,
  IProviderSettlementDocument,
  ISettlementLine,
  IPaymentDocument,
  IReconciliationDocument,
  InvoiceType,
  InvoiceStatus,
  PaymentType,
  PaymentMethod,
  PaymentStatus,
  SettlementType,
  SettlementStatus,
  ReconciliationStatus,
} from './hmo-billing.types.js';

const invoiceLineSchema = new Schema<IInvoiceLine>(
  {
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unitAmount: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    reference: { type: String, trim: true },
  },
  { _id: false }
);

const invoiceSchema = new Schema<IInvoiceDocument>(
  {
    hmoId: { type: Schema.Types.ObjectId, required: true, ref: 'HMO', index: true },
    invoiceNumber: { type: String, required: true, trim: true, uppercase: true },
    invoiceType: { type: String, enum: Object.values(InvoiceType), required: true, index: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'Enrollee', index: true },
    corporateAccountId: { type: Schema.Types.ObjectId, index: true },
    planId: { type: Schema.Types.ObjectId, ref: 'HealthPlan', index: true },
    periodStart: { type: Date, required: true, index: true },
    periodEnd: { type: Date, required: true, index: true },
    issueDate: { type: Date, required: true },
    dueDate: { type: Date, required: true, index: true },
    lines: { type: [invoiceLineSchema], required: true, default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, required: true, min: 0, default: 0 },
    taxAmount: { type: Number, required: true, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, min: 0, default: 0 },
    balanceAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, trim: true, default: 'NGN' },
    status: { type: String, enum: Object.values(InvoiceStatus), required: true, default: InvoiceStatus.DRAFT, index: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

invoiceSchema.index({ hmoId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ hmoId: 1, status: 1, dueDate: 1 });

const settlementLineSchema = new Schema<ISettlementLine>(
  {
    claimId: { type: Schema.Types.ObjectId, ref: 'Claim' },
    tariffId: { type: Schema.Types.ObjectId, ref: 'Tariff' },
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0, default: 1 },
    tariffAmount: { type: Number, min: 0 },
    claimedAmount: { type: Number, required: true, min: 0 },
    approvedAmount: { type: Number, required: true, min: 0 },
    adjustmentAmount: { type: Number, required: true, min: 0, default: 0 },
    payableAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, default: 'NGN' },
  },
  { _id: false }
);

const settlementSchema = new Schema<IProviderSettlementDocument>(
  {
    hmoId: { type: Schema.Types.ObjectId, required: true, ref: 'HMO', index: true },
    settlementNumber: { type: String, required: true, uppercase: true, trim: true },
    providerId: { type: Schema.Types.ObjectId, required: true, ref: 'Provider', index: true },
    settlementType: { type: String, enum: Object.values(SettlementType), required: true, index: true },
    periodStart: { type: Date, required: true, index: true },
    periodEnd: { type: Date, required: true, index: true },
    lines: { type: [settlementLineSchema], required: true, default: [] },
    grossAmount: { type: Number, required: true, min: 0 },
    adjustmentAmount: { type: Number, required: true, min: 0, default: 0 },
    payableAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, min: 0, default: 0 },
    balanceAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, default: 'NGN' },
    status: { type: String, enum: Object.values(SettlementStatus), required: true, default: SettlementStatus.DRAFT, index: true },
    paymentDueDate: { type: Date },
    approvedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

settlementSchema.index({ hmoId: 1, settlementNumber: 1 }, { unique: true });
settlementSchema.index({ hmoId: 1, providerId: 1, status: 1, periodEnd: -1 });

const paymentSchema = new Schema<IPaymentDocument>(
  {
    hmoId: { type: Schema.Types.ObjectId, required: true, ref: 'HMO', index: true },
    paymentReference: { type: String, required: true, uppercase: true, trim: true },
    paymentType: { type: String, enum: Object.values(PaymentType), required: true, index: true },
    method: { type: String, enum: Object.values(PaymentMethod), required: true },
    status: { type: String, enum: Object.values(PaymentStatus), required: true, default: PaymentStatus.PENDING, index: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'BillingInvoice', index: true },
    settlementId: { type: Schema.Types.ObjectId, ref: 'ProviderSettlement', index: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'Enrollee', index: true },
    providerId: { type: Schema.Types.ObjectId, ref: 'Provider', index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, default: 'NGN' },
    paidAt: { type: Date },
    transactionReference: { type: String, trim: true },
    gatewayReference: { type: String, trim: true },
    payerName: { type: String, trim: true },
    payeeName: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

paymentSchema.index({ hmoId: 1, paymentReference: 1 }, { unique: true });

const reconciliationSchema = new Schema<IReconciliationDocument>(
  {
    hmoId: { type: Schema.Types.ObjectId, required: true, ref: 'HMO', index: true },
    reconciliationNumber: { type: String, required: true, uppercase: true, trim: true },
    paymentId: { type: Schema.Types.ObjectId, required: true, ref: 'HmoPayment', index: true },
    targetType: { type: String, enum: Object.values(PaymentType), required: true },
    targetId: { type: Schema.Types.ObjectId },
    expectedAmount: { type: Number, required: true, min: 0 },
    receivedAmount: { type: Number, required: true, min: 0 },
    varianceAmount: { type: Number, required: true },
    status: { type: String, enum: Object.values(ReconciliationStatus), required: true, default: ReconciliationStatus.OPEN, index: true },
    reconciledAt: { type: Date },
    reconciledBy: { type: Schema.Types.ObjectId },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

reconciliationSchema.index({ hmoId: 1, reconciliationNumber: 1 }, { unique: true });

export type BillingInvoiceHydratedDocument = HydratedDocument<IInvoiceDocument>;
export type ProviderSettlementHydratedDocument = HydratedDocument<IProviderSettlementDocument>;
export type PaymentHydratedDocument = HydratedDocument<IPaymentDocument>;
export type ReconciliationHydratedDocument = HydratedDocument<IReconciliationDocument>;

export const BillingInvoiceModel =
  (mongoose.models.BillingInvoice as Model<IInvoiceDocument> | undefined) ??
  mongoose.model<IInvoiceDocument>('BillingInvoice', invoiceSchema);

export const ProviderSettlementModel =
  (mongoose.models.ProviderSettlement as Model<IProviderSettlementDocument> | undefined) ??
  mongoose.model<IProviderSettlementDocument>('ProviderSettlement', settlementSchema);

export const HmoPaymentModel =
  (mongoose.models.HmoPayment as Model<IPaymentDocument> | undefined) ??
  mongoose.model<IPaymentDocument>('HmoPayment', paymentSchema);

export const BillingReconciliationModel =
  (mongoose.models.BillingReconciliation as Model<IReconciliationDocument> | undefined) ??
  mongoose.model<IReconciliationDocument>('BillingReconciliation', reconciliationSchema);
