import { Router } from 'express';
import { BillingController } from './billing.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  authorize('ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'),
  BillingController.createInvoice
);

router.get(
  '/',
  authorize('ADMIN', 'ACCOUNTANT', 'DOCTOR', 'RECEPTIONIST'),
  BillingController.getInvoices
);

router.get(
  '/summary',
  authorize('ADMIN', 'ACCOUNTANT'),
  BillingController.getRevenueSummary
);

router.get(
  '/:id',
  authorize('ADMIN', 'ACCOUNTANT', 'DOCTOR', 'RECEPTIONIST'),
  BillingController.getInvoiceById
);

router.post(
  '/:id/payments',
  authorize('ADMIN', 'ACCOUNTANT'),
  BillingController.recordPayment
);

router.patch(
  '/:id/cancel',
  authorize('ADMIN', 'ACCOUNTANT'),
  BillingController.cancelInvoice
);

export default router;