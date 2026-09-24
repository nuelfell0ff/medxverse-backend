import { Router } from 'express';
import { authenticateAccount } from '../../middlewares/auth.middleware.js';
import { billingController } from './hmo-billing.controller.js';
const router = Router();
router.use(authenticateAccount);
// Dashboard / financial summary
router.get('/summary', (req, res, next) => billingController.summary(req, res).catch(next));
// Tariff quotation used by billing/payment calculations.
router.post('/tariffs/quote', (req, res, next) => billingController.quoteTariff(req, res).catch(next));
// Premium / corporate invoices.
router.get('/invoices', (req, res, next) => billingController.listInvoices(req, res).catch(next));
router.post('/invoices', (req, res, next) => billingController.createInvoice(req, res).catch(next));
router.get('/invoices/:id', (req, res, next) => billingController.getInvoice(req, res).catch(next));
router.patch('/invoices/:id', (req, res, next) => billingController.updateInvoice(req, res).catch(next));
router.patch('/invoices/:id/status', (req, res, next) => billingController.setInvoiceStatus(req, res).catch(next));
// Provider settlements: fee-for-service and capitation.
router.get('/settlements', (req, res, next) => billingController.listSettlements(req, res).catch(next));
router.post('/settlements', (req, res, next) => billingController.createSettlement(req, res).catch(next));
router.post('/settlements/capitation', (req, res, next) => billingController.createCapitationSettlement(req, res).catch(next));
router.get('/settlements/:id', (req, res, next) => billingController.getSettlement(req, res).catch(next));
router.patch('/settlements/:id/status', (req, res, next) => billingController.setSettlementStatus(req, res).catch(next));
// Payments.
router.get('/payments', (req, res, next) => billingController.listPayments(req, res).catch(next));
router.post('/payments', (req, res, next) => billingController.createPayment(req, res).catch(next));
router.get('/payments/:id', (req, res, next) => billingController.getPayment(req, res).catch(next));
router.patch('/payments/:id/status', (req, res, next) => billingController.setPaymentStatus(req, res).catch(next));
// Reconciliation.
router.post('/reconciliation', (req, res, next) => billingController.reconcile(req, res).catch(next));
export default router;
