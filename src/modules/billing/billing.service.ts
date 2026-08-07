import { Types } from 'mongoose';
import { InvoiceModel } from './billing.model.js';
import {
  CreateInvoiceInput,
  GetInvoicesQuery,
  IInvoiceDocument,
  InvoiceStatus,
  RecordPaymentInput,
} from './billing.types.js';

export class BillingService {
  private generateInvoiceNumber(): string {
    const prefix = 'INV';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${timestamp}-${random}`;
  }

  private generateTransactionId(): string {
    const prefix = 'TXN';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${timestamp}-${random}`;
  }

  public async createInvoice(input: CreateInvoiceInput): Promise<IInvoiceDocument> {
    const formattedItems = input.items.map((item) => ({
      ...item,
      totalPrice: item.quantity * item.unitPrice,
    }));

    const subtotal = formattedItems.reduce((acc, curr) => acc + curr.totalPrice, 0);
    const discount = input.discount || 0;
    const tax = input.tax || 0;
    const totalAmount = Math.max(0, subtotal - discount + tax);
    const invoiceNumber = this.generateInvoiceNumber();

    return InvoiceModel.create({
      hospitalId: input.hospitalId,
      patientId: input.patientId,
      invoiceNumber,
      items: formattedItems,
      subtotal,
      discount,
      tax,
      totalAmount,
      amountPaid: 0,
      balanceDue: totalAmount,
      status: InvoiceStatus.PENDING,
      dueDate: input.dueDate,
      createdById: input.createdById,
      notes: input.notes,
    });
  }

  public async getInvoices(
    hospitalId: string,
    query: GetInvoicesQuery
  ): Promise<{ invoices: IInvoiceDocument[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hospitalId };

    if (query.status) filter.status = query.status;
    if (query.patientId) filter.patientId = query.patientId;

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) {
        (filter.createdAt as Record<string, unknown>).$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        (filter.createdAt as Record<string, unknown>).$lte = new Date(query.endDate);
      }
    }

    const [invoices, total] = await Promise.all([
      InvoiceModel.find(filter)
        .populate('patientId', 'firstName lastName mrn phone email')
        .populate('createdById', 'firstName lastName role')
        .populate('payments.receivedBy', 'firstName lastName role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      InvoiceModel.countDocuments(filter),
    ]);

    return {
      invoices,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getInvoiceById(invoiceId: string, hospitalId: string): Promise<IInvoiceDocument | null> {
    return InvoiceModel.findOne({ _id: invoiceId, hospitalId })
      .populate('patientId', 'firstName lastName mrn phone email address')
      .populate('createdById', 'firstName lastName role')
      .populate('payments.receivedBy', 'firstName lastName role')
      .exec();
  }

  public async recordPayment(
    invoiceId: string,
    hospitalId: string,
    input: RecordPaymentInput
  ): Promise<IInvoiceDocument | null> {
    const invoice = await InvoiceModel.findOne({ _id: invoiceId, hospitalId });
    if (!invoice) {
      throw new Error('Invoice not found.');
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new Error('Invoice is already fully paid.');
    }

    if (input.amount > invoice.balanceDue) {
      throw new Error(`Payment amount (${input.amount}) exceeds balance due (${invoice.balanceDue}).`);
    }

    const paymentRecord = {
      transactionId: this.generateTransactionId(),
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      paymentReference: input.paymentReference,
      receivedBy: new Types.ObjectId(input.receivedBy),
      paidAt: new Date(),
      notes: input.notes,
    };

    const newAmountPaid = invoice.amountPaid + input.amount;
    const newBalanceDue = Math.max(0, invoice.totalAmount - newAmountPaid);
    const newStatus =
      newBalanceDue === 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

    return InvoiceModel.findOneAndUpdate(
      { _id: invoiceId, hospitalId },
      {
        $set: {
          amountPaid: newAmountPaid,
          balanceDue: newBalanceDue,
          status: newStatus,
        },
        $push: { payments: paymentRecord },
      },
      { new: true }
    ).exec();
  }

  public async cancelInvoice(
    invoiceId: string,
    hospitalId: string,
    reason?: string
  ): Promise<IInvoiceDocument | null> {
    return InvoiceModel.findOneAndUpdate(
      { _id: invoiceId, hospitalId, status: InvoiceStatus.PENDING },
      {
        $set: {
          status: InvoiceStatus.CANCELLED,
          notes: reason ? `Cancelled: ${reason}` : 'Cancelled',
        },
      },
      { new: true }
    ).exec();
  }
}

export const billingService = new BillingService();