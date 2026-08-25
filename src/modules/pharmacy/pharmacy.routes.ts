import { Router } from 'express';

import {
  PharmacyController,
} from './pharmacy.controller.js';

import {
  authenticate,
} from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

/* =========================================================
   INVENTORY MANAGEMENT
========================================================= */

router.post(
  '/inventory',
  PharmacyController.createItem
);

router.get(
  '/inventory',
  PharmacyController.listInventory
);

router.get(
  '/inventory/:id',
  PharmacyController.getItemById
);

router.patch(
  '/inventory/:id/stock',
  PharmacyController.adjustStock
);

/* =========================================================
   DISPENSING MANAGEMENT
========================================================= */

router.post(
  '/dispense',
  PharmacyController.dispenseDrugs
);

router.get(
  '/dispense',
  PharmacyController.listDispenseRecords
);

/* =========================================================
   BILLING
========================================================= */

/**
 * Retry a failed or partially captured pharmacy charge.
 *
 * POST /pharmacy/dispense/:id/billing/retry
 */
router.post(
  '/dispense/:id/billing/retry',
  PharmacyController.retryBilling
);

export default router;