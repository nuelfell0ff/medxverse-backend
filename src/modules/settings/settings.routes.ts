import { Router } from 'express';

import {
  authenticateAccount,
  restrictTo,
} from '../../middlewares/auth.middleware.js';

import {
  hmoSettingsController,
} from './settings.controller.js';

const router = Router();

router.use(authenticateAccount);

// Read settings.
// Any authenticated HMO account can view them.
router.get(
  '/',
  restrictTo(
    'HMO',
    'HMO_ADMIN',
    'HMO_CLAIMS_OFFICER',
    'HMO_MEDICAL_OFFICER',
    'HMO_OFFICER'
  ),
  (req, res, next) => {
    hmoSettingsController
      .get(req, res)
      .catch(next);
  }
);

// Update settings.
// Organization-wide configuration is admin-only.
router.patch(
  '/',
  restrictTo('HMO', 'HMO_ADMIN'),
  (req, res, next) => {
    hmoSettingsController
      .update(req, res)
      .catch(next);
  }
);

// Reset settings.
// Destructive configuration operation — admin-only.
router.post(
  '/reset',
  restrictTo('HMO', 'HMO_ADMIN'),
  (req, res, next) => {
    hmoSettingsController
      .reset(req, res)
      .catch(next);
  }
);

export default router;