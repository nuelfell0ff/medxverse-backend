import { billingService } from './billing.service.js';
export class BillingController {
    async createInvoice(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const createdById = authReq.user._id;
            const { patientId, items, discount, tax, dueDate, notes } = req.body;
            const invoice = await billingService.createInvoice({
                hospitalId,
                patientId,
                items: items,
                discount,
                tax,
                dueDate: dueDate ? new Date(dueDate) : undefined,
                createdById,
                notes,
            });
            res.status(201).json({ success: true, data: invoice });
        }
        catch (error) {
            next(error);
        }
    }
    async getInvoices(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const status = req.query.status;
            const patientId = req.query.patientId;
            const startDate = req.query.startDate;
            const endDate = req.query.endDate;
            const result = await billingService.getInvoices(hospitalId, {
                page,
                limit,
                status,
                patientId,
                startDate,
                endDate,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getInvoiceById(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const invoice = await billingService.getInvoiceById(id, hospitalId);
            if (!invoice) {
                res.status(404).json({ success: false, message: 'Invoice not found' });
                return;
            }
            res.status(200).json({ success: true, data: invoice });
        }
        catch (error) {
            next(error);
        }
    }
    async recordPayment(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const receivedBy = authReq.user._id;
            const id = req.params.id;
            const { amount, paymentMethod, paymentReference, notes } = req.body;
            const updated = await billingService.recordPayment(id, hospitalId, {
                amount,
                paymentMethod: paymentMethod,
                paymentReference,
                receivedBy,
                notes,
            });
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async cancelInvoice(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const { reason } = req.body;
            const updated = await billingService.cancelInvoice(id, hospitalId, reason);
            if (!updated) {
                res.status(404).json({ success: false, message: 'Invoice not found or cannot be cancelled' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
}
export const billingController = new BillingController();
