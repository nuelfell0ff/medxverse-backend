import { Router } from 'express';
import { PatientPortalController } from './patient-portal.controller.js';
import { authLimiter } from '../../middlewares/rateLimiter.middleware.js';

const router = Router();

// Public hospital directory: only public hospital profile fields are returned.
router.get('/hospitals', (req, res) => PatientPortalController.listHospitals(req, res));
router.post('/register', authLimiter, (req, res) => PatientPortalController.register(req, res));
router.post('/login', authLimiter, (req, res) => PatientPortalController.login(req, res));
// Linking verifies portal password and matches hospital code + MRN + DOB + name/email.
router.post('/link', authLimiter, (req, res) => PatientPortalController.linkHospital(req, res));

export default router;
