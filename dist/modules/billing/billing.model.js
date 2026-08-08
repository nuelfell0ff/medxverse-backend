import { Schema, model } from 'mongoose';
import { InvoiceStatus, PaymentMethod, LineItemCategory, } from './billing.types.js';
const InvoiceLineItemSchema = new Schema({
    description: { type: String, required: true, trim: true },
    category: {
        type: String,
        enum: Object.values(LineItemCategory),
        required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    referenceId: { type: String, trim: true },
}, { _id: false });
const PaymentRecordSchema = new Schema({
    transactionId: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentMethod: {
        type: String,
        enum: Object.values(PaymentMethod),
        required: true,
    },
    paymentReference: { type: String, trim: true },
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    paidAt: { type: Date, default: Date.now, required: true },
    notes: { type: String, trim: true },
}, { _id: false });
const InvoiceSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    invoiceNumber: { type: String, required: true, unique: true, trim: true, index: true },
    status: {
        type: String,
        enum: Object.values(InvoiceStatus),
        default: InvoiceStatus.PENDING,
        required: true,
        index: true,
    },
    items: { type: [InvoiceLineItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    balanceDue: { type: Number, required: true, min: 0 },
    payments: [PaymentRecordSchema],
    dueDate: { type: Date },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, trim: true },
}, { timestamps: true });
InvoiceSchema.index({ hospitalId: 1, status: 1, createdAt: -1 });
export const InvoiceModel = model('Invoice', InvoiceSchema);
