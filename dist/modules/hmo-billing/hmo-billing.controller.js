import { billingService } from './hmo-billing.service.js';
const payload = (body) => body?.data ?? body;
const hmoIdFromRequest = (req) => {
    const authReq = req;
    const candidates = [
        authReq.user?.hmoId,
        authReq.user?.accountType === 'HMO' ? authReq.user?.accountId : undefined,
        authReq.user?.organizationId,
        authReq.account?.hmoId,
        authReq.account?.accountType === 'HMO' ? authReq.account?.accountId : undefined,
        authReq.hmoId,
    ];
    const value = candidates.find(Boolean);
    if (!value)
        throw new Error('HMO context is required');
    return String(value);
};
const actorIdFromRequest = (req) => {
    const authReq = req;
    return authReq.user?._id || authReq.user?.accountId || authReq.account?._id || authReq.account?.id;
};
export class BillingController {
    async summary(req, res) {
        return res.json({ success: true, data: await billingService.summary(hmoIdFromRequest(req)) });
    }
    async createInvoice(req, res) {
        const data = await billingService.createInvoice(hmoIdFromRequest(req), payload(req.body));
        return res.status(201).json({ success: true, data, message: 'Premium invoice created successfully' });
    }
    async listInvoices(req, res) {
        return res.json({ success: true, data: await billingService.listInvoices(hmoIdFromRequest(req), req.query) });
    }
    async getInvoice(req, res) {
        const data = await billingService.getInvoice(req.params.id, hmoIdFromRequest(req));
        if (!data)
            return res.status(404).json({ success: false, message: 'Invoice not found' });
        return res.json({ success: true, data });
    }
    async updateInvoice(req, res) {
        const data = await billingService.updateInvoice(req.params.id, hmoIdFromRequest(req), payload(req.body));
        if (!data)
            return res.status(404).json({ success: false, message: 'Invoice not found' });
        return res.json({ success: true, data, message: 'Invoice updated successfully' });
    }
    async setInvoiceStatus(req, res) {
        const data = await billingService.setInvoiceStatus(req.params.id, hmoIdFromRequest(req), payload(req.body)?.status);
        if (!data)
            return res.status(404).json({ success: false, message: 'Invoice not found' });
        return res.json({ success: true, data, message: 'Invoice status updated successfully' });
    }
    async createSettlement(req, res) {
        const data = await billingService.createSettlement(hmoIdFromRequest(req), payload(req.body));
        return res.status(201).json({ success: true, data, message: 'Provider settlement created successfully' });
    }
    async createCapitationSettlement(req, res) {
        const data = await billingService.capitationSettlement(hmoIdFromRequest(req), payload(req.body));
        return res.status(201).json({ success: true, data, message: 'Capitation settlement created successfully' });
    }
    async listSettlements(req, res) {
        return res.json({ success: true, data: await billingService.listSettlements(hmoIdFromRequest(req), req.query) });
    }
    async getSettlement(req, res) {
        const data = await billingService.getSettlement(req.params.id, hmoIdFromRequest(req));
        if (!data)
            return res.status(404).json({ success: false, message: 'Settlement not found' });
        return res.json({ success: true, data });
    }
    async setSettlementStatus(req, res) {
        const data = await billingService.setSettlementStatus(req.params.id, hmoIdFromRequest(req), payload(req.body)?.status, actorIdFromRequest(req));
        if (!data)
            return res.status(404).json({ success: false, message: 'Settlement not found' });
        return res.json({ success: true, data, message: 'Settlement status updated successfully' });
    }
    async createPayment(req, res) {
        const data = await billingService.createPayment(hmoIdFromRequest(req), payload(req.body));
        return res.status(201).json({ success: true, data, message: 'Payment recorded successfully' });
    }
    async listPayments(req, res) {
        return res.json({ success: true, data: await billingService.listPayments(hmoIdFromRequest(req), req.query) });
    }
    async getPayment(req, res) {
        const data = await billingService.getPayment(req.params.id, hmoIdFromRequest(req));
        if (!data)
            return res.status(404).json({ success: false, message: 'Payment not found' });
        return res.json({ success: true, data });
    }
    async setPaymentStatus(req, res) {
        const data = await billingService.setPaymentStatus(req.params.id, hmoIdFromRequest(req), payload(req.body)?.status);
        if (!data)
            return res.status(404).json({ success: false, message: 'Payment not found' });
        return res.json({ success: true, data, message: 'Payment status updated successfully' });
    }
    async reconcile(req, res) {
        const data = await billingService.reconcilePayment(hmoIdFromRequest(req), payload(req.body), actorIdFromRequest(req));
        return res.status(201).json({ success: true, data, message: 'Payment reconciliation recorded successfully' });
    }
    async quoteTariff(req, res) {
        const body = payload(req.body);
        const data = await billingService.quoteTariff(hmoIdFromRequest(req), body.tariffId, body.providerId, Number(body.quantity ?? 1), body.date);
        if (!data)
            return res.status(404).json({ success: false, message: 'Active tariff not found' });
        return res.json({ success: true, data });
    }
}
export const billingController = new BillingController();
