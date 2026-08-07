import { Document, Types } from 'mongoose';

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  INSURANCE = 'INSURANCE',
  MOBILE_MONEY = 'MOBILE_MONEY',
  OTHER = 'OTHER',
}

export enum InvoiceStatus {
  PENDING = 'PENDING',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export enum LineItemCategory {
  CONSULTATION = 'CONSULTATION',
  LABORATORY = 'LABORATORY',
  RADIOLOGY = 'RADIOLOGY',
  PHARMACY = 'PHARMACY',
  SURGERY = 'SURGERY',
  BED_CHARGE = 'BED_CHARGE',
  PROCEDURE = 'PROCEDURE',
  MISCELLANEOUS = 'MISCELLANEOUS',
}

export interface IInvoiceLineItem {
  description: string;
  category: LineItemCategory;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  referenceId?: string; // Links to LabOrder, Prescription, Encounter, etc.
}

export interface IPaymentRecord {
  transactionId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  receivedBy: Types.ObjectId;
  paidAt: Date;
  notes?: string;
}

export interface IInvoice {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  invoiceNumber: string;
  status: InvoiceStatus;
  items: IInvoiceLineItem[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  payments: IPaymentRecord[];
  dueDate?: Date;
  createdById: Types.ObjectId;
  notes?: string;
}

export interface IInvoiceDocument extends IInvoice, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInvoiceInput {
  hospitalId: string;
  patientId: string;
  items: {
    description: string;
    category: LineItemCategory;
    quantity: number;
    unitPrice: number;
    referenceId?: string;
  }[];
  discount?: number;
  tax?: number;
  dueDate?: Date;
  createdById: string;
  notes?: string;
}

export interface RecordPaymentInput {
  amount: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  receivedBy: string;
  notes?: string;
}

export interface GetInvoicesQuery {
  page?: number;
  limit?: number;
  status?: InvoiceStatus;
  patientId?: string;
  startDate?: string;
  endDate?: string;
}