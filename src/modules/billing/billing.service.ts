import { InvoiceModel, PaymentRecordModel } from './billing.model.js';
import { CreateInvoiceDto, ProcessPaymentDto } from './billing.types.js';

export class BillingService {
  public static async createInvoice(hospitalId: string, data: CreateInvoiceDto) {
    const calculatedItems = data.items.map((item) => ({
      ...item,
      totalPrice: item.unitPrice * item.quantity,
    }));

    const subtotal = calculatedItems.reduce((acc, item) => acc + item.totalPrice, 0);
    const discount = data.discount || 0;
    const totalAmount = subtotal - discount;

    const invoice = await InvoiceModel.create({
      hospitalId,
      patientId: data.patientId,
      items: calculatedItems,
      paymentCategory: data.paymentCategory,
      hmoId: data.hmoId,
      subtotal,
      discount,
      totalAmount,
      amountPaid: 0,
      paymentStatus: 'UNPAID',
    });

    return invoice;
  }

  public static async getInvoices(
    hospitalId: string,
    filters: { status?: string; patientId?: string; page?: number; limit?: number }
  ) {
    const query: any = { hospitalId };
    if (filters.status) query.paymentStatus = filters.status;
    if (filters.patientId) query.patientId = filters.patientId;

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      InvoiceModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
      InvoiceModel.countDocuments(query),
    ]);

    return { invoices, total, page, limit, pages: Math.ceil(total / limit) };
  }

  public static async getInvoiceById(id: string, hospitalId: string) {
    const invoice = await InvoiceModel.findOne({ _id: id, hospitalId });
    if (!invoice) throw new Error('Invoice not found');
    return invoice;
  }

  public static async processPayment(
    id: string,
    hospitalId: string,
    processedBy: string,
    data: ProcessPaymentDto
  ) {
    const invoice = await InvoiceModel.findOne({ _id: id, hospitalId });
    if (!invoice) throw new Error('Invoice not found');

    const payment = await PaymentRecordModel.create({
      hospitalId,
      invoiceId: id,
      processedBy,
      amountPaid: data.amountPaid,
      paymentMethod: data.paymentMethod,
      reference: data.reference,
    });

    const newAmountPaid = invoice.amountPaid + data.amountPaid;
    let paymentStatus = invoice.paymentStatus;

    if (newAmountPaid >= invoice.totalAmount) {
      paymentStatus = 'PAID';
    } else if (newAmountPaid > 0) {
      paymentStatus = 'PARTIALLY_PAID';
    }

    invoice.amountPaid = newAmountPaid;
    invoice.paymentStatus = paymentStatus;
    await invoice.save();

    return { payment, invoice };
  }
}