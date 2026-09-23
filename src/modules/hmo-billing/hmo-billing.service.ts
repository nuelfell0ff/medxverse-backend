import { Types } from 'mongoose';
import { TariffModel } from '../tariffs/tariffs.model.js';
import { TariffStatus } from '../tariffs/tariffs.types.js';
import {
  BillingInvoiceModel,
  ProviderSettlementModel,
  HmoPaymentModel,
  BillingReconciliationModel,
} from './hmo-billing.model.js';
import {
  BillingQuery,
  CreateInvoiceInput,
  CreatePaymentInput,
  CreateSettlementInput,
  InvoiceStatus,
  InvoiceType,
  IPaymentDocument,
  IInvoiceDocument,
  IProviderSettlementDocument,
  PaymentStatus,
  PaymentType,
  ReconcilePaymentInput,
  ReconciliationStatus,
  SettlementStatus,
  SettlementType,
  UpdateInvoiceInput,
} from './hmo-billing.types.js';

const isObjectId = (value: string) => Types.ObjectId.isValid(value);

const objectId = (value: string, field: string) => {
  if (!isObjectId(value)) throw new Error(`Invalid ${field}`);
  return new Types.ObjectId(value);
};

const money = (value: number, field = 'Amount') => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a finite number greater than or equal to 0`);
  }
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

const dateValue = (value: string | Date, field: string) => {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid ${field}`);
  return date;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sequence = (prefix: string) => {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
  const random = Math.floor(Math.random() * 900000 + 100000);
  return `${prefix}-${stamp}-${random}`;
};

const pageParams = (query: BillingQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

const dateRange = (from?: string, to?: string) => {
  if (!from && !to) return undefined;
  const range: Record<string, Date> = {};
  if (from) range.$gte = dateValue(from, 'from date');
  if (to) range.$lte = dateValue(to, 'to date');
  return range;
};

export class BillingService {
  public async createInvoice(hmoId: string, input: CreateInvoiceInput) {
    const hmo = objectId(hmoId, 'HMO ID');
    if (!input.invoiceType) throw new Error('Invoice type is required');
    if (!input.lines?.length) throw new Error('At least one invoice line is required');

    const periodStart = dateValue(input.periodStart, 'periodStart');
    const periodEnd = dateValue(input.periodEnd, 'periodEnd');
    const issueDate = input.issueDate ? dateValue(input.issueDate, 'issueDate') : new Date();
    const dueDate = dateValue(input.dueDate, 'dueDate');

    if (periodEnd < periodStart) throw new Error('periodEnd cannot be earlier than periodStart');
    if (dueDate < issueDate) throw new Error('dueDate cannot be earlier than issueDate');

    const lines = input.lines.map((line) => {
      const quantity = Number(line.quantity);
      const unitAmount = money(Number(line.unitAmount), 'Invoice unit amount');
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Invoice quantity must be greater than 0');
      return {
        description: line.description?.trim(),
        quantity,
        unitAmount,
        amount: money(quantity * unitAmount, 'Invoice line amount'),
        reference: line.reference?.trim() || undefined,
      };
    });

    if (lines.some((line) => !line.description)) throw new Error('Invoice line description is required');

    const subtotal = money(lines.reduce((sum, line) => sum + line.amount, 0), 'Invoice subtotal');
    const discountAmount = money(Number(input.discountAmount ?? 0), 'Discount amount');
    const taxAmount = money(Number(input.taxAmount ?? 0), 'Tax amount');
    if (discountAmount > subtotal) throw new Error('Discount cannot exceed invoice subtotal');

    const totalAmount = money(subtotal - discountAmount + taxAmount, 'Invoice total');

    const memberId = input.memberId ? objectId(input.memberId, 'member ID') : undefined;
    const corporateAccountId = input.corporateAccountId
      ? objectId(input.corporateAccountId, 'corporate account ID')
      : undefined;
    const planId = input.planId ? objectId(input.planId, 'plan ID') : undefined;

    return BillingInvoiceModel.create({
      hmoId: hmo,
      invoiceNumber: sequence(input.invoiceType === InvoiceType.CORPORATE_PREMIUM ? 'CINV' : 'INV'),
      invoiceType: input.invoiceType,
      memberId,
      corporateAccountId,
      planId,
      periodStart,
      periodEnd,
      issueDate,
      dueDate,
      lines,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      currency: input.currency?.trim().toUpperCase() || 'NGN',
      status: InvoiceStatus.DRAFT,
      notes: input.notes?.trim() || undefined,
    });
  }

  public async listInvoices(hmoId: string, filters: BillingQuery) {
    const { page, limit, skip } = pageParams(filters);
    const query: Record<string, any> = { hmoId: objectId(hmoId, 'HMO ID') };
    if (filters.status) query.status = filters.status;
    if (filters.invoiceType) query.invoiceType = filters.invoiceType;
    if (filters.memberId) query.memberId = objectId(filters.memberId, 'member ID');
    if (filters.from || filters.to) query.issueDate = dateRange(filters.from, filters.to);
    if (filters.search?.trim()) {
      const regex = new RegExp(escapeRegex(filters.search.trim()), 'i');
      query.$or = [{ invoiceNumber: regex }, { 'lines.description': regex }];
    }

    const [items, total] = await Promise.all([
      BillingInvoiceModel.find(query).sort({ issueDate: -1, _id: -1 }).skip(skip).limit(limit).exec(),
      BillingInvoiceModel.countDocuments(query),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  public async getInvoice(id: string, hmoId: string) {
    return BillingInvoiceModel.findOne({ _id: objectId(id, 'invoice ID'), hmoId: objectId(hmoId, 'HMO ID') }).exec();
  }

  public async updateInvoice(id: string, hmoId: string, input: UpdateInvoiceInput) {
    const invoice = await this.getInvoice(id, hmoId);
    if (!invoice) return null;
    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELLED) {
      throw new Error('Paid or cancelled invoices cannot be edited');
    }

    if (input.dueDate !== undefined) invoice.dueDate = dateValue(input.dueDate, 'dueDate');
    if (input.discountAmount !== undefined) invoice.discountAmount = money(Number(input.discountAmount), 'Discount amount');
    if (input.taxAmount !== undefined) invoice.taxAmount = money(Number(input.taxAmount), 'Tax amount');
    if (input.notes !== undefined) invoice.notes = input.notes.trim() || undefined;

    invoice.totalAmount = money(invoice.subtotal - invoice.discountAmount + invoice.taxAmount, 'Invoice total');
    if (invoice.discountAmount > invoice.subtotal) throw new Error('Discount cannot exceed invoice subtotal');
    invoice.balanceAmount = Math.max(0, money(invoice.totalAmount - invoice.paidAmount, 'Invoice balance'));

    if (input.status !== undefined) invoice.status = input.status;
    if (invoice.balanceAmount === 0) invoice.status = InvoiceStatus.PAID;

    return invoice.save();
  }

  public async setInvoiceStatus(id: string, hmoId: string, status: InvoiceStatus) {
    if (!Object.values(InvoiceStatus).includes(status)) throw new Error(`Invalid invoice status: ${status}`);
    const invoice = await this.getInvoice(id, hmoId);
    if (!invoice) return null;
    if (invoice.status === InvoiceStatus.PAID && status !== InvoiceStatus.PAID) {
      throw new Error('A paid invoice cannot move backwards to another status');
    }
    invoice.status = status;
    return invoice.save();
  }

  public async createSettlement(hmoId: string, input: CreateSettlementInput) {
    const hmo = objectId(hmoId, 'HMO ID');
    const providerId = objectId(input.providerId, 'provider ID');
    if (!input.lines?.length) throw new Error('At least one settlement line is required');

    const periodStart = dateValue(input.periodStart, 'periodStart');
    const periodEnd = dateValue(input.periodEnd, 'periodEnd');
    if (periodEnd < periodStart) throw new Error('periodEnd cannot be earlier than periodStart');

    const currency = input.currency?.trim().toUpperCase() || 'NGN';
    const lines = input.lines.map((line) => {
      const quantity = Number(line.quantity ?? 1);
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Settlement quantity must be greater than 0');
      const claimedAmount = money(Number(line.claimedAmount), 'Claimed amount');
      const approvedAmount = money(Number(line.approvedAmount), 'Approved amount');
      const adjustmentAmount = money(Number(line.adjustmentAmount ?? Math.max(0, claimedAmount - approvedAmount)), 'Adjustment amount');
      if (approvedAmount > claimedAmount) throw new Error('Approved amount cannot exceed claimed amount');
      const payableAmount = money(Math.max(0, approvedAmount - adjustmentAmount), 'Payable amount');
      return {
        claimId: line.claimId ? objectId(line.claimId, 'claim ID') : undefined,
        tariffId: line.tariffId ? objectId(line.tariffId, 'tariff ID') : undefined,
        description: line.description?.trim(),
        quantity,
        tariffAmount: line.tariffAmount === undefined ? undefined : money(Number(line.tariffAmount), 'Tariff amount'),
        claimedAmount,
        approvedAmount,
        adjustmentAmount,
        payableAmount,
        currency: line.currency?.trim().toUpperCase() || currency,
      };
    });

    if (lines.some((line) => !line.description)) throw new Error('Settlement line description is required');

    const grossAmount = money(lines.reduce((sum, line) => sum + line.approvedAmount, 0), 'Settlement gross amount');
    const adjustmentAmount = money(lines.reduce((sum, line) => sum + line.adjustmentAmount, 0), 'Settlement adjustment amount');
    const payableAmount = money(lines.reduce((sum, line) => sum + line.payableAmount, 0), 'Settlement payable amount');

    return ProviderSettlementModel.create({
      hmoId: hmo,
      settlementNumber: sequence('SET'),
      providerId,
      settlementType: input.settlementType,
      periodStart,
      periodEnd,
      lines,
      grossAmount,
      adjustmentAmount,
      payableAmount,
      paidAmount: 0,
      balanceAmount: payableAmount,
      currency,
      status: SettlementStatus.DRAFT,
      paymentDueDate: input.paymentDueDate ? dateValue(input.paymentDueDate, 'paymentDueDate') : undefined,
      notes: input.notes?.trim() || undefined,
    });
  }

  public async listSettlements(hmoId: string, filters: BillingQuery) {
    const { page, limit, skip } = pageParams(filters);
    const query: Record<string, any> = { hmoId: objectId(hmoId, 'HMO ID') };
    if (filters.status) query.status = filters.status;
    if (filters.providerId) query.providerId = objectId(filters.providerId, 'provider ID');
    if (filters.from || filters.to) query.periodEnd = dateRange(filters.from, filters.to);
    if (filters.search?.trim()) {
      query.settlementNumber = new RegExp(escapeRegex(filters.search.trim()), 'i');
    }

    const [items, total] = await Promise.all([
      ProviderSettlementModel.find(query).sort({ periodEnd: -1, _id: -1 }).skip(skip).limit(limit).exec(),
      ProviderSettlementModel.countDocuments(query),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  public async getSettlement(id: string, hmoId: string) {
    return ProviderSettlementModel.findOne({ _id: objectId(id, 'settlement ID'), hmoId: objectId(hmoId, 'HMO ID') }).exec();
  }

  public async setSettlementStatus(id: string, hmoId: string, status: SettlementStatus, actorId?: string) {
    if (!Object.values(SettlementStatus).includes(status)) throw new Error(`Invalid settlement status: ${status}`);
    const settlement = await this.getSettlement(id, hmoId);
    if (!settlement) return null;
    if (settlement.status === SettlementStatus.PAID && status !== SettlementStatus.PAID) throw new Error('A paid settlement cannot move backwards');
    settlement.status = status;
    if (status === SettlementStatus.APPROVED) {
      settlement.approvedAt = new Date();
      settlement.approvedBy = actorId && isObjectId(actorId) ? new Types.ObjectId(actorId) : undefined;
    }
    return settlement.save();
  }

  public async createPayment(hmoId: string, input: CreatePaymentInput) {
    const hmo = objectId(hmoId, 'HMO ID');
    const amount = money(Number(input.amount), 'Payment amount');
    if (amount <= 0) throw new Error('Payment amount must be greater than 0');

    const invoiceId = input.invoiceId ? objectId(input.invoiceId, 'invoice ID') : undefined;
    const settlementId = input.settlementId ? objectId(input.settlementId, 'settlement ID') : undefined;
    const memberId = input.memberId ? objectId(input.memberId, 'member ID') : undefined;
    const providerId = input.providerId ? objectId(input.providerId, 'provider ID') : undefined;

    if (input.paymentType === PaymentType.PREMIUM && !invoiceId) throw new Error('Premium payments require an invoice ID');
    if (input.paymentType === PaymentType.PROVIDER_SETTLEMENT && !settlementId) throw new Error('Provider settlement payments require a settlement ID');

    const payment = await HmoPaymentModel.create({
      hmoId: hmo,
      paymentReference: sequence('PAY'),
      paymentType: input.paymentType,
      method: input.method,
      status: PaymentStatus.PENDING,
      invoiceId,
      settlementId,
      memberId,
      providerId,
      amount,
      currency: input.currency?.trim().toUpperCase() || 'NGN',
      paidAt: input.paidAt ? dateValue(input.paidAt, 'paidAt') : undefined,
      transactionReference: input.transactionReference?.trim() || undefined,
      gatewayReference: input.gatewayReference?.trim() || undefined,
      payerName: input.payerName?.trim() || undefined,
      payeeName: input.payeeName?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
    });

    return payment;
  }

  public async listPayments(hmoId: string, filters: BillingQuery) {
    const { page, limit, skip } = pageParams(filters);
    const query: Record<string, any> = { hmoId: objectId(hmoId, 'HMO ID') };
    if (filters.paymentStatus) query.status = filters.paymentStatus;
    if (filters.paymentType) query.paymentType = filters.paymentType;
    if (filters.memberId) query.memberId = objectId(filters.memberId, 'member ID');
    if (filters.providerId) query.providerId = objectId(filters.providerId, 'provider ID');
    if (filters.from || filters.to) query.createdAt = dateRange(filters.from, filters.to);
    if (filters.search?.trim()) {
      const regex = new RegExp(escapeRegex(filters.search.trim()), 'i');
      query.$or = [{ paymentReference: regex }, { transactionReference: regex }, { gatewayReference: regex }];
    }

    const [items, total] = await Promise.all([
      HmoPaymentModel.find(query).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).exec(),
      HmoPaymentModel.countDocuments(query),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  public async getPayment(id: string, hmoId: string) {
    return HmoPaymentModel.findOne({ _id: objectId(id, 'payment ID'), hmoId: objectId(hmoId, 'HMO ID') }).exec();
  }

  public async setPaymentStatus(id: string, hmoId: string, status: PaymentStatus) {
    if (!Object.values(PaymentStatus).includes(status)) throw new Error(`Invalid payment status: ${status}`);
    const payment = await this.getPayment(id, hmoId);
    if (!payment) return null;

    if (payment.status === PaymentStatus.SUCCESS && status === PaymentStatus.PENDING) {
      throw new Error('A successful payment cannot return to pending');
    }

    const alreadySuccessful = payment.status === PaymentStatus.SUCCESS;
    payment.status = status;
    if (status === PaymentStatus.SUCCESS && !alreadySuccessful) {
      payment.paidAt = payment.paidAt ?? new Date();
      await this.applySuccessfulPayment(payment);
    }
    return payment.save();
  }

  private async applySuccessfulPayment(payment: IPaymentDocument) {
    if (payment.paymentType === PaymentType.PREMIUM && payment.invoiceId) {
      const invoice = await BillingInvoiceModel.findOne({ _id: payment.invoiceId, hmoId: payment.hmoId });
      if (!invoice) throw new Error('Linked premium invoice not found');
      if (invoice.status === InvoiceStatus.CANCELLED) throw new Error('Cannot pay a cancelled invoice');

      invoice.paidAmount = money(Math.min(invoice.totalAmount, invoice.paidAmount + payment.amount), 'Invoice paid amount');
      invoice.balanceAmount = money(Math.max(0, invoice.totalAmount - invoice.paidAmount), 'Invoice balance');
      invoice.status = invoice.balanceAmount === 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;
      await invoice.save();
    }

    if (payment.paymentType === PaymentType.PROVIDER_SETTLEMENT && payment.settlementId) {
      const settlement = await ProviderSettlementModel.findOne({ _id: payment.settlementId, hmoId: payment.hmoId });
      if (!settlement) throw new Error('Linked provider settlement not found');

      settlement.paidAmount = money(Math.min(settlement.payableAmount, settlement.paidAmount + payment.amount), 'Settlement paid amount');
      settlement.balanceAmount = money(Math.max(0, settlement.payableAmount - settlement.paidAmount), 'Settlement balance');
      settlement.status = settlement.balanceAmount === 0 ? SettlementStatus.PAID : SettlementStatus.PARTIALLY_PAID;
      await settlement.save();
    }
  }

  public async reconcilePayment(hmoId: string, input: ReconcilePaymentInput, actorId?: string) {
    const payment = await this.getPayment(input.paymentId, hmoId);
    if (!payment) throw new Error('Payment not found');

    const expectedAmount = money(Number(input.expectedAmount), 'Expected amount');
    const receivedAmount = money(payment.amount, 'Received amount');
    const varianceAmount = money(Math.abs(expectedAmount - receivedAmount), 'Variance amount');
    const status = varianceAmount === 0 ? ReconciliationStatus.MATCHED : ReconciliationStatus.PARTIAL;

    return BillingReconciliationModel.create({
      hmoId: objectId(hmoId, 'HMO ID'),
      reconciliationNumber: sequence('REC'),
      paymentId: payment._id,
      targetType: input.targetType,
      targetId: input.targetId ? objectId(input.targetId, 'target ID') : undefined,
      expectedAmount,
      receivedAmount,
      varianceAmount,
      status,
      reconciledAt: status === ReconciliationStatus.MATCHED ? new Date() : undefined,
      reconciledBy: actorId && isObjectId(actorId) ? new Types.ObjectId(actorId) : undefined,
      notes: input.notes?.trim() || undefined,
    });
  }

  public async quoteTariff(hmoId: string, tariffId: string, providerId: string | undefined, quantity = 1, date?: string) {
    const tariff = await TariffModel.findOne({
      _id: objectId(tariffId, 'tariff ID'),
      hmoId: objectId(hmoId, 'HMO ID'),
      status: TariffStatus.ACTIVE,
    }).exec();
    if (!tariff) return null;

    const quoteDate = date ? dateValue(date, 'quote date') : new Date();
    if (quoteDate < tariff.effectiveFrom || (tariff.effectiveTo && quoteDate > tariff.effectiveTo)) {
      throw new Error('Tariff is not effective on the requested date');
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) throw new Error('Quantity must be greater than 0');

    let unitAmount = tariff.baseAmount;
    if (providerId) {
      const providerObjectId = objectId(providerId, 'provider ID');
      const providerRate = tariff.providerRates.find((rate) => rate.providerId.toString() === providerObjectId.toString());
      if (providerRate) unitAmount = providerRate.amount;
    }

    return {
      tariffId: tariff._id,
      code: tariff.code,
      name: tariff.name,
      unitAmount,
      quantity: qty,
      totalAmount: money(unitAmount * qty, 'Quoted amount'),
      currency: tariff.currency,
      requiresPreAuth: tariff.requiresPreAuth,
      effectiveFrom: tariff.effectiveFrom,
      effectiveTo: tariff.effectiveTo,
    };
  }

  public async summary(hmoId: string) {
    const hmo = objectId(hmoId, 'HMO ID');
    const [invoiceAgg, paymentAgg, settlementAgg, outstandingInvoices, outstandingSettlements] = await Promise.all([
      BillingInvoiceModel.aggregate([
        { $match: { hmoId: hmo } },
        { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$totalAmount' }, paid: { $sum: '$paidAmount' }, balance: { $sum: '$balanceAmount' } } },
      ]),
      HmoPaymentModel.aggregate([
        { $match: { hmoId: hmo } },
        { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
      ]),
      ProviderSettlementModel.aggregate([
        { $match: { hmoId: hmo } },
        { $group: { _id: '$status', count: { $sum: 1 }, payable: { $sum: '$payableAmount' }, paid: { $sum: '$paidAmount' }, balance: { $sum: '$balanceAmount' } } },
      ]),
      BillingInvoiceModel.aggregate([
        { $match: { hmoId: hmo, balanceAmount: { $gt: 0 }, status: { $nin: [InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT] } } },
        { $group: { _id: null, amount: { $sum: '$balanceAmount' }, count: { $sum: 1 } } },
      ]),
      ProviderSettlementModel.aggregate([
        { $match: { hmoId: hmo, balanceAmount: { $gt: 0 }, status: { $nin: [SettlementStatus.CANCELLED, SettlementStatus.DRAFT] } } },
        { $group: { _id: null, amount: { $sum: '$balanceAmount' }, count: { $sum: 1 } } },
      ]),
    ]);

    return {
      invoices: invoiceAgg,
      payments: paymentAgg,
      settlements: settlementAgg,
      receivables: outstandingInvoices[0] ?? { amount: 0, count: 0 },
      providerPayables: outstandingSettlements[0] ?? { amount: 0, count: 0 },
    };
  }

  public async capitationSettlement(hmoId: string, input: {
    providerId: string;
    periodStart: string | Date;
    periodEnd: string | Date;
    memberCount: number;
    ratePerMember: number;
    currency?: string;
    notes?: string;
  }) {
    const memberCount = Number(input.memberCount);
    const ratePerMember = money(Number(input.ratePerMember), 'Capitation rate');
    if (!Number.isFinite(memberCount) || memberCount <= 0) throw new Error('memberCount must be greater than 0');

    const payable = money(memberCount * ratePerMember, 'Capitation payable');
    return this.createSettlement(hmoId, {
      providerId: input.providerId,
      settlementType: SettlementType.CAPITATION,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      currency: input.currency,
      notes: input.notes,
      lines: [{
        description: `Capitation for ${memberCount} enrolled members`,
        quantity: memberCount,
        claimedAmount: payable,
        approvedAmount: payable,
        adjustmentAmount: 0,
        currency: input.currency,
      }],
    });
  }
}

export const billingService = new BillingService();
