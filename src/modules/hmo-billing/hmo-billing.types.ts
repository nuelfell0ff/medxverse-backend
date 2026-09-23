import { Types } from 'mongoose';

export enum InvoiceType {
  MEMBER_PREMIUM = 'MEMBER_PREMIUM',
  CORPORATE_PREMIUM = 'CORPORATE_PREMIUM',
  OTHER = 'OTHER',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum PaymentType {
  PREMIUM = 'PREMIUM',
  PROVIDER_SETTLEMENT = 'PROVIDER_SETTLEMENT',
  REFUND = 'REFUND',
  OTHER = 'OTHER',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  CARD = 'CARD',
  USSD = 'USSD',
  CASH = 'CASH',
  DIRECT_DEBIT = 'DIRECT_DEBIT',
  MOBILE_MONEY = 'MOBILE_MONEY',
  OTHER = 'OTHER',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
  REFUNDED = 'REFUNDED',
}

export enum SettlementType {
  FEE_FOR_SERVICE = 'FEE_FOR_SERVICE',
  CAPITATION = 'CAPITATION',
  OTHER = 'OTHER',
}

export enum SettlementStatus {
  DRAFT = 'DRAFT',
  READY = 'READY',
  APPROVED = 'APPROVED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  DISPUTED = 'DISPUTED',
  CANCELLED = 'CANCELLED',
}

export enum ReconciliationStatus {
  OPEN = 'OPEN',
  MATCHED = 'MATCHED',
  PARTIAL = 'PARTIAL',
  DISPUTED = 'DISPUTED',
  RESOLVED = 'RESOLVED',
}

export interface IInvoiceLine {
  description: string;
  quantity: number;
  unitAmount: number;
  amount: number;
  reference?: string;
}

export interface IInvoiceDocument {
  _id: Types.ObjectId;
  hmoId: Types.ObjectId;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  memberId?: Types.ObjectId;
  corporateAccountId?: Types.ObjectId;
  planId?: Types.ObjectId;
  periodStart: Date;
  periodEnd: Date;
  issueDate: Date;
  dueDate: Date;
  lines: IInvoiceLine[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  currency: string;
  status: InvoiceStatus;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISettlementLine {
  claimId?: Types.ObjectId;
  tariffId?: Types.ObjectId;
  description: string;
  quantity: number;
  tariffAmount?: number;
  claimedAmount: number;
  approvedAmount: number;
  adjustmentAmount: number;
  payableAmount: number;
  currency: string;
}

export interface IProviderSettlementDocument {
  _id: Types.ObjectId;
  hmoId: Types.ObjectId;
  settlementNumber: string;
  providerId: Types.ObjectId;
  settlementType: SettlementType;
  periodStart: Date;
  periodEnd: Date;
  lines: ISettlementLine[];
  grossAmount: number;
  adjustmentAmount: number;
  payableAmount: number;
  paidAmount: number;
  balanceAmount: number;
  currency: string;
  status: SettlementStatus;
  paymentDueDate?: Date;
  approvedAt?: Date;
  approvedBy?: Types.ObjectId;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPaymentDocument {
  _id: Types.ObjectId;
  hmoId: Types.ObjectId;
  paymentReference: string;
  paymentType: PaymentType;
  method: PaymentMethod;
  status: PaymentStatus;
  invoiceId?: Types.ObjectId;
  settlementId?: Types.ObjectId;
  memberId?: Types.ObjectId;
  providerId?: Types.ObjectId;
  amount: number;
  currency: string;
  paidAt?: Date;
  transactionReference?: string;
  gatewayReference?: string;
  payerName?: string;
  payeeName?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IReconciliationDocument {
  _id: Types.ObjectId;
  hmoId: Types.ObjectId;
  reconciliationNumber: string;
  paymentId: Types.ObjectId;
  targetType: PaymentType;
  targetId?: Types.ObjectId;
  expectedAmount: number;
  receivedAmount: number;
  varianceAmount: number;
  status: ReconciliationStatus;
  reconciledAt?: Date;
  reconciledBy?: Types.ObjectId;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateInvoiceInput {
  invoiceType: InvoiceType;
  memberId?: string;
  corporateAccountId?: string;
  planId?: string;
  periodStart: string | Date;
  periodEnd: string | Date;
  issueDate?: string | Date;
  dueDate: string | Date;
  lines: Array<{
    description: string;
    quantity: number;
    unitAmount: number;
    reference?: string;
  }>;
  discountAmount?: number;
  taxAmount?: number;
  currency?: string;
  notes?: string;
}

export interface UpdateInvoiceInput {
  dueDate?: string | Date;
  discountAmount?: number;
  taxAmount?: number;
  notes?: string;
  status?: InvoiceStatus;
}

export interface CreateSettlementInput {
  providerId: string;
  settlementType: SettlementType;
  periodStart: string | Date;
  periodEnd: string | Date;
  paymentDueDate?: string | Date;
  lines: Array<{
    claimId?: string;
    tariffId?: string;
    description: string;
    quantity?: number;
    tariffAmount?: number;
    claimedAmount: number;
    approvedAmount: number;
    adjustmentAmount?: number;
    currency?: string;
  }>;
  currency?: string;
  notes?: string;
}

export interface CreatePaymentInput {
  paymentType: PaymentType;
  method: PaymentMethod;
  amount: number;
  currency?: string;
  invoiceId?: string;
  settlementId?: string;
  memberId?: string;
  providerId?: string;
  transactionReference?: string;
  gatewayReference?: string;
  payerName?: string;
  payeeName?: string;
  paidAt?: string | Date;
  notes?: string;
}

export interface ReconcilePaymentInput {
  paymentId: string;
  expectedAmount: number;
  targetType: PaymentType;
  targetId?: string;
  notes?: string;
}

export interface BillingQuery {
  page?: number | string;
  limit?: number | string;
  search?: string;
  status?: string;
  invoiceType?: InvoiceType;
  paymentStatus?: PaymentStatus;
  paymentType?: PaymentType;
  providerId?: string;
  memberId?: string;
  from?: string;
  to?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
