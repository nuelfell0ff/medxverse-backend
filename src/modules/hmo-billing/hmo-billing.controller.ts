import { Request, Response } from 'express';
import { billingService } from './hmo-billing.service.js';
import { InvoiceStatus, PaymentStatus, SettlementStatus } from './hmo-billing.types.js';

const payload = (body: any) => body?.data ?? body;

interface AuthenticatedRequest extends Request {
  user?: {
    _id?: string;
    accountId?: string;
    hmoId?: string;
    organizationId?: string;
    accountType?: 'HOSPITAL' | 'HMO';
    [key: string]: unknown;
  };
  account?: {
    _id?: string;
    id?: string;
    accountId?: string;
    accountType?: 'HOSPITAL' | 'HMO';
    hmoId?: string;
    [key: string]: unknown;
  };
  hmoId?: string;
}

const hmoIdFromRequest = (req: Request): string => {
  const authReq = req as AuthenticatedRequest;
  const candidates = [
    authReq.user?.hmoId,
    authReq.user?.accountType === 'HMO' ? authReq.user?.accountId : undefined,
    authReq.user?.organizationId,
    authReq.account?.hmoId,
    authReq.account?.accountType === 'HMO' ? authReq.account?.accountId : undefined,
    authReq.hmoId,
  ];
  const value = candidates.find(Boolean);
  if (!value) throw new Error('HMO context is required');
  return String(value);
};

const actorIdFromRequest = (req: Request): string | undefined => {
  const authReq = req as AuthenticatedRequest;
  return authReq.user?._id || authReq.user?.accountId || authReq.account?._id || authReq.account?.id;
};

export class BillingController {
  public async summary(req: Request, res: Response) {
    return res.json({ success: true, data: await billingService.summary(hmoIdFromRequest(req)) });
  }

  public async createInvoice(req: Request, res: Response) {
    const data = await billingService.createInvoice(hmoIdFromRequest(req), payload(req.body));
    return res.status(201).json({ success: true, data, message: 'Premium invoice created successfully' });
  }

  public async listInvoices(req: Request, res: Response) {
    return res.json({ success: true, data: await billingService.listInvoices(hmoIdFromRequest(req), req.query as any) });
  }

  public async getInvoice(req: Request, res: Response) {
    const data = await billingService.getInvoice(req.params.id, hmoIdFromRequest(req));
    if (!data) return res.status(404).json({ success: false, message: 'Invoice not found' });
    return res.json({ success: true, data });
  }

  public async updateInvoice(req: Request, res: Response) {
    const data = await billingService.updateInvoice(req.params.id, hmoIdFromRequest(req), payload(req.body));
    if (!data) return res.status(404).json({ success: false, message: 'Invoice not found' });
    return res.json({ success: true, data, message: 'Invoice updated successfully' });
  }

  public async setInvoiceStatus(req: Request, res: Response) {
    const data = await billingService.setInvoiceStatus(req.params.id, hmoIdFromRequest(req), payload(req.body)?.status as InvoiceStatus);
    if (!data) return res.status(404).json({ success: false, message: 'Invoice not found' });
    return res.json({ success: true, data, message: 'Invoice status updated successfully' });
  }

  public async createSettlement(req: Request, res: Response) {
    const data = await billingService.createSettlement(hmoIdFromRequest(req), payload(req.body));
    return res.status(201).json({ success: true, data, message: 'Provider settlement created successfully' });
  }

  public async createCapitationSettlement(req: Request, res: Response) {
    const data = await billingService.capitationSettlement(hmoIdFromRequest(req), payload(req.body));
    return res.status(201).json({ success: true, data, message: 'Capitation settlement created successfully' });
  }

  public async listSettlements(req: Request, res: Response) {
    return res.json({ success: true, data: await billingService.listSettlements(hmoIdFromRequest(req), req.query as any) });
  }

  public async getSettlement(req: Request, res: Response) {
    const data = await billingService.getSettlement(req.params.id, hmoIdFromRequest(req));
    if (!data) return res.status(404).json({ success: false, message: 'Settlement not found' });
    return res.json({ success: true, data });
  }

  public async setSettlementStatus(req: Request, res: Response) {
    const data = await billingService.setSettlementStatus(req.params.id, hmoIdFromRequest(req), payload(req.body)?.status as SettlementStatus, actorIdFromRequest(req));
    if (!data) return res.status(404).json({ success: false, message: 'Settlement not found' });
    return res.json({ success: true, data, message: 'Settlement status updated successfully' });
  }

  public async createPayment(req: Request, res: Response) {
    const data = await billingService.createPayment(hmoIdFromRequest(req), payload(req.body));
    return res.status(201).json({ success: true, data, message: 'Payment recorded successfully' });
  }

  public async listPayments(req: Request, res: Response) {
    return res.json({ success: true, data: await billingService.listPayments(hmoIdFromRequest(req), req.query as any) });
  }

  public async getPayment(req: Request, res: Response) {
    const data = await billingService.getPayment(req.params.id, hmoIdFromRequest(req));
    if (!data) return res.status(404).json({ success: false, message: 'Payment not found' });
    return res.json({ success: true, data });
  }

  public async setPaymentStatus(req: Request, res: Response) {
    const data = await billingService.setPaymentStatus(req.params.id, hmoIdFromRequest(req), payload(req.body)?.status as PaymentStatus);
    if (!data) return res.status(404).json({ success: false, message: 'Payment not found' });
    return res.json({ success: true, data, message: 'Payment status updated successfully' });
  }

  public async reconcile(req: Request, res: Response) {
    const data = await billingService.reconcilePayment(hmoIdFromRequest(req), payload(req.body), actorIdFromRequest(req));
    return res.status(201).json({ success: true, data, message: 'Payment reconciliation recorded successfully' });
  }

  public async quoteTariff(req: Request, res: Response) {
    const body = payload(req.body);
    const data = await billingService.quoteTariff(hmoIdFromRequest(req), body.tariffId, body.providerId, Number(body.quantity ?? 1), body.date);
    if (!data) return res.status(404).json({ success: false, message: 'Active tariff not found' });
    return res.json({ success: true, data });
  }
}

export const billingController = new BillingController();
