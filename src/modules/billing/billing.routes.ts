import { Router } from 'express';
import { BillingController } from './billing.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/invoices', authorize('HOSPITAL', 'ADMIN', 'BILLING_OFFICER'), BillingController.createInvoice);
router.get('/invoices', authorize('HOSPITAL', 'ADMIN', 'BILLING_OFFICER', 'ACCOUNTANT'), BillingController.getInvoices);
router.get('/invoices/:id', authorize('HOSPITAL', 'ADMIN', 'BILLING_OFFICER', 'ACCOUNTANT'), BillingController.getInvoiceById);
router.post('/invoices/:id/payments', authorize('HOSPITAL', 'ADMIN', 'BILLING_OFFICER', 'CASHIER'), BillingController.processPayment);

export default router;