import { Document, Types } from 'mongoose';

export type PaymentCategory = 'CASH' | 'HMO' | 'INSURANCE';
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED';
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'HMO_CLAIM';

export interface IInvoiceItem {
  serviceName: string;
  code?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface IInvoice extends Document {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  items: IInvoiceItem[];
  paymentCategory: PaymentCategory;
  hmoId?: Types.ObjectId;
  subtotal: number;
  discount: number;
  totalAmount: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentRecord extends Document {
  hospitalId: Types.ObjectId;
  invoiceId: Types.ObjectId;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  processedBy: Types.ObjectId;
  processedAt: Date;
}

export interface CreateInvoiceDto {
  patientId: string;
  items: Array<{ serviceName: string; code?: string; unitPrice: number; quantity: number }>;
  paymentCategory: PaymentCategory;
  hmoId?: string;
  discount?: number;
}

export interface ProcessPaymentDto {
  amountPaid: number;
  paymentMethod: PaymentMethod;
  reference?: string;
}