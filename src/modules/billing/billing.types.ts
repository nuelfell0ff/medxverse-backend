import { Document, Types } from 'mongoose';

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  INSURANCE = 'INSURANCE',
  MOBILE_MONEY = 'MOBILE_MONEY',
}

export enum ItemCategory {
  CONSULTATION = 'CONSULTATION',
  LAB_TEST = 'LAB_TEST',
  PHARMACY = 'PHARMACY',
  PROCEDURE = 'PROCEDURE',
  ROOM_CHARGE = 'ROOM_CHARGE',
  OTHER = 'OTHER',
}

export interface IInvoiceItem {
  description: string;
  category: ItemCategory;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface IPaymentRecord {
  _id?: Types.ObjectId;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionRef?: string;
  paidAt: Date;
  paidBy: Types.ObjectId;
  notes?: string;
}

export interface IBillingInvoice {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  invoiceNumber: string;
  items: IInvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: InvoiceStatus;
  dueDate: Date;
  payments: IPaymentRecord[];
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IBillingInvoiceDocument extends IBillingInvoice, Document {}

export interface ICreateInvoiceDTO {
  patientId: string;
  items: Array<{
    description: string;
    category: ItemCategory;
    quantity: number;
    unitPrice: number;
  }>;
  discount?: number;
  tax?: number;
  dueDate: Date;
  notes?: string;
}

export interface IRecordPaymentDTO {
  amount: number;
  paymentMethod: PaymentMethod;
  transactionRef?: string;
  notes?: string;
}

export interface IInvoiceQueryFilters {
  patientId?: string;
  status?: InvoiceStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}