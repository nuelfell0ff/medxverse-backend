import { Types } from 'mongoose';
import { BillingInvoiceModel } from './billing.model.js';
import {
  ICreateInvoiceDTO,
  IRecordPaymentDTO,
  IInvoiceQueryFilters,
  InvoiceStatus,
  IBillingInvoiceDocument,
} from './billing.types.js';

export class BillingService {
  private static generateInvoiceNumber(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `INV-${timestamp}-${random}`;
  }

  static async createInvoice(
    hospitalId: string,
    userId: string,
    dto: ICreateInvoiceDTO
  ): Promise<IBillingInvoiceDocument> {
    const items = dto.items.map((item) => ({
      ...item,
      totalPrice: item.quantity * item.unitPrice,
    }));

    const invoiceNumber = this.generateInvoiceNumber();

    const invoice = new BillingInvoiceModel({
      hospitalId: new Types.ObjectId(hospitalId),
      patientId: new Types.ObjectId(dto.patientId),
      invoiceNumber,
      items,
      discount: dto.discount || 0,
      tax: dto.tax || 0,
      dueDate: dto.dueDate,
      notes: dto.notes,
      createdBy: new Types.ObjectId(userId),
      payments: [],
    });

    return await invoice.save();
  }

  static async getInvoices(hospitalId: string, filters: IInvoiceQueryFilters) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {
      hospitalId: new Types.ObjectId(hospitalId),
    };

    if (filters.patientId) {
      query.patientId = new Types.ObjectId(filters.patientId);
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const [invoices, total] = await Promise.all([
      BillingInvoiceModel.find(query)
        .populate('patientId', 'firstName lastName email phone')
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BillingInvoiceModel.countDocuments(query),
    ]);

    return {
      invoices,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async getInvoiceById(hospitalId: string, invoiceId: string): Promise<IBillingInvoiceDocument> {
    const invoice = await BillingInvoiceModel.findOne({
      _id: new Types.ObjectId(invoiceId),
      hospitalId: new Types.ObjectId(hospitalId),
    })
      .populate('patientId', 'firstName lastName email phone gender dob')
      .populate('createdBy', 'firstName lastName email')
      .populate('payments.paidBy', 'firstName lastName');

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    return invoice;
  }

  static async recordPayment(
    hospitalId: string,
    invoiceId: string,
    userId: string,
    dto: IRecordPaymentDTO
  ): Promise<IBillingInvoiceDocument> {
    const invoice = await BillingInvoiceModel.findOne({
      _id: new Types.ObjectId(invoiceId),
      hospitalId: new Types.ObjectId(hospitalId),
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new Error('Cannot record payment for a cancelled invoice');
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new Error('Invoice is already fully paid');
    }

    if (dto.amount > invoice.balanceDue) {
      throw new Error(`Payment amount exceeds balance due of $${invoice.balanceDue.toFixed(2)}`);
    }

    invoice.payments.push({
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      transactionRef: dto.transactionRef,
      paidAt: new Date(),
      paidBy: new Types.ObjectId(userId),
      notes: dto.notes,
    });

    return await invoice.save();
  }

  static async cancelInvoice(
    hospitalId: string,
    invoiceId: string,
    reason?: string
  ): Promise<IBillingInvoiceDocument> {
    const invoice = await BillingInvoiceModel.findOne({
      _id: new Types.ObjectId(invoiceId),
      hospitalId: new Types.ObjectId(hospitalId),
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.amountPaid > 0) {
      throw new Error('Cannot cancel an invoice with recorded payments');
    }

    invoice.status = InvoiceStatus.CANCELLED;
    if (reason) {
      invoice.notes = invoice.notes ? `${invoice.notes}\nCancellation Reason: ${reason}` : `Cancellation Reason: ${reason}`;
    }

    return await invoice.save();
  }

  static async getRevenueSummary(hospitalId: string) {
    const matchHospital = { hospitalId: new Types.ObjectId(hospitalId) };

    const summary = await BillingInvoiceModel.aggregate([
      { $match: matchHospital },
      {
        $group: {
          _id: null,
          totalBilled: { $sum: '$totalAmount' },
          totalCollected: { $sum: '$amountPaid' },
          totalOutstanding: { $sum: '$balanceDue' },
          totalInvoices: { $sum: 1 },
        },
      },
    ]);

    return summary[0] || { totalBilled: 0, totalCollected: 0, totalOutstanding: 0, totalInvoices: 0 };
  }
}