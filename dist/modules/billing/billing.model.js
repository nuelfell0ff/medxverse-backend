import mongoose, { Schema } from 'mongoose';
import { BillingAccountStatus, BillingSourceModule, ChargeCategory, ChargeStatus, PaymentMethod, PaymentPlanFrequency, PaymentPlanStatus, PaymentStatus, ReconciliationStatus, RefundStatus, } from './billing.types.js';
const BillingAccountSchema = new Schema({
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
}, { timestamps: true });
BillingAccountSchema.index({ hospitalId: 1, patientId: 1 }, { unique: true });
export const BillingAccountModel = mongoose.models.BillingAccount ||
    mongoose.model('BillingAccount', BillingAccountSchema);
const PricingHistorySchema = new Schema({
    version: { type: Number, required: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true },
    effectiveFrom: Date,
    effectiveTo: Date,
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
    reason: { type: String, trim: true },
}, { _id: false });
const PricingCatalogueSchema = new Schema({
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
}, { timestamps: true });
/*
 * One current catalogue document represents one pricing plan for a
 * hospital + department + service code. Price/version history lives inside
 * the document, so we must NOT include isActive/version in the identity.
 *
 * departmentName is normalized by billing.service.ts (e.g. Outpatient,
 * OUTPATIENTS and OPD all become OUTPATIENT), which makes it safe to use in
 * the uniqueness rule even when departmentId is not supplied by a module.
 */
PricingCatalogueSchema.index({
    hospitalId: 1,
    departmentName: 1,
    code: 1,
    planName: 1,
}, { unique: true, name: 'hospital_department_code_plan_unique' });
/*
 * Useful for catalogue lookups that filter by hospital/department/status.
 * This is intentionally non-unique.
 */
PricingCatalogueSchema.index({
    hospitalId: 1,
    departmentName: 1,
    isActive: 1,
});
export const PricingCatalogueModel = mongoose.models.PricingCatalogue ||
    mongoose.model('PricingCatalogue', PricingCatalogueSchema);
const ChargeSchema = new Schema({
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
}, { timestamps: true });
ChargeSchema.index({ hospitalId: 1, patientId: 1, chargeDate: -1 });
ChargeSchema.index({ sourceModule: 1, sourceId: 1 });
export const ChargeModel = mongoose.models.BillingCharge ||
    mongoose.model('BillingCharge', ChargeSchema);
const PaymentSchema = new Schema({
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
}, { timestamps: true });
export const PaymentModel = mongoose.models.BillingPayment ||
    mongoose.model('BillingPayment', PaymentSchema);
const RefundSchema = new Schema({
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
}, { timestamps: true });
export const RefundModel = mongoose.models.BillingRefund ||
    mongoose.model('BillingRefund', RefundSchema);
const InstallmentSchema = new Schema({
    dueDate: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, min: 0, default: 0 },
    status: {
        type: String,
        enum: ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'],
        default: 'PENDING',
    },
    paidAt: Date,
}, { _id: true });
const PaymentPlanSchema = new Schema({
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
}, { timestamps: true });
export const PaymentPlanModel = mongoose.models.PaymentPlan ||
    mongoose.model('PaymentPlan', PaymentPlanSchema);
