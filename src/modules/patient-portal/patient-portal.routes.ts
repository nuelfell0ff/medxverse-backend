import { Router } from 'express';
import { PatientPortalController } from './patient-portal.controller.js';
import { authLimiter } from '../../middlewares/rateLimiter.middleware.js';

const router = Router();
router.post('/register', authLimiter, (req, res) => PatientPortalController.register(req, res));
router.post('/login', authLimiter, (req, res) => PatientPortalController.login(req, res));
export default router;
