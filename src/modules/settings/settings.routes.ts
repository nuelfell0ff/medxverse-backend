import { Router } from 'express';
import { settingsController } from './settings.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

// Settings Profile & Branding
router.post('/config', (req, res, next) => settingsController.upsertSettings(req, res, next));
router.get('/config', (req, res, next) => settingsController.getSettings(req, res, next));

// Clinical Templates
router.post('/templates', (req, res, next) =>
  settingsController.createClinicalTemplate(req, res, next)
);
router.get('/templates', (req, res, next) =>
  settingsController.getClinicalTemplates(req, res, next)
);

// Integrations
router.post('/integrations', (req, res, next) =>
  settingsController.createIntegration(req, res, next)
);
router.get('/integrations', (req, res, next) =>
  settingsController.getIntegrations(req, res, next)
);

export default router;