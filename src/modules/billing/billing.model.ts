import { Schema, model } from 'mongoose';
import { IInvoice, IPaymentRecord } from './billing.types.js';

const invoiceItemSchema = new Schema({
  serviceName: { type: String, required: true },
  code: { type: String },
  unitPrice: { type: Number, required: true },
  quantity: { type: Number, required: true, default: 1 },
  totalPrice: { type: Number, required: true },
});

const invoiceSchema = new Schema<IInvoice>(
  {
    hospitalId: { type: Schema.Types.ObjectId, required: true, ref: 'Hospital', index: true },
    patientId: { type: Schema.Types.ObjectId, required: true, ref: 'Patient', index: true },
    items: [invoiceItemSchema],
    paymentCategory: {
      type: String,
      enum: ['CASH', 'HMO', 'INSURANCE'],
      required: true,
    },
    hmoId: { type: Schema.Types.ObjectId, ref: 'HmoProvider' },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED'],
      default: 'UNPAID',
      index: true,
    },
  },
  { timestamps: true }
);

const paymentRecordSchema = new Schema<IPaymentRecord>(
  {
    hospitalId: { type: Schema.Types.ObjectId, required: true, ref: 'Hospital', index: true },
    invoiceId: { type: Schema.Types.ObjectId, required: true, ref: 'Invoice', index: true },
    amountPaid: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'CARD', 'BANK_TRANSFER', 'HMO_CLAIM'],
      required: true,
    },
    reference: { type: String },
    processedBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const InvoiceModel = model<IInvoice>('Invoice', invoiceSchema);
export const PaymentRecordModel = model<IPaymentRecord>('PaymentRecord', paymentRecordSchema);