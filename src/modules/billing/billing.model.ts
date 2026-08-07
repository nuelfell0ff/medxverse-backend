import { Schema, model } from 'mongoose';
import {
  IBillingInvoice,
  IBillingInvoiceDocument,
  InvoiceStatus,
  PaymentMethod,
  ItemCategory,
} from './billing.types.js';

const InvoiceItemSchema = new Schema(
  {
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: Object.values(ItemCategory),
      default: ItemCategory.OTHER,
    },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PaymentRecordSchema = new Schema(
  {
    amount: { type: Number, required: true, min: 0.01 },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
    },
    transactionRef: { type: String, trim: true },
    paidAt: { type: Date, default: Date.now },
    paidBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

const BillingInvoiceSchema = new Schema<IBillingInvoiceDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    invoiceNumber: { type: String, required: true, unique: true, trim: true, index: true },
    items: [InvoiceItemSchema],
    subtotal: { type: Number, required: true, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, default: 0, min: 0 },
    amountPaid: { type: Number, required: true, default: 0, min: 0 },
    balanceDue: { type: Number, required: true, default: 0, min: 0 },
    status: {
      type: String,
      enum: Object.values(InvoiceStatus),
      default: InvoiceStatus.PENDING,
      index: true,
    },
    dueDate: { type: Date, required: true, index: true },
    payments: [PaymentRecordSchema],
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

BillingInvoiceSchema.pre('save', function (this: IBillingInvoiceDocument, next) {
  this.subtotal = this.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  this.totalAmount = Math.max(0, this.subtotal - (this.discount || 0) + (this.tax || 0));
  this.amountPaid = this.payments.reduce((sum, payment) => sum + payment.amount, 0);
  this.balanceDue = Math.max(0, this.totalAmount - this.amountPaid);

  if (this.status !== InvoiceStatus.CANCELLED && this.status !== InvoiceStatus.REFUNDED) {
    if (this.balanceDue === 0 && this.totalAmount > 0) {
      this.status = InvoiceStatus.PAID;
    } else if (this.amountPaid > 0 && this.balanceDue > 0) {
      this.status = InvoiceStatus.PARTIALLY_PAID;
    } else {
      this.status = InvoiceStatus.PENDING;
    }
  }
});

export const BillingInvoiceModel = model<IBillingInvoiceDocument>('BillingInvoice', BillingInvoiceSchema);