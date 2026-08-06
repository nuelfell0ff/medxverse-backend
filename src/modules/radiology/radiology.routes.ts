import { Router } from 'express';
import { RadiologyController } from './radiology.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/requests', authorize('HOSPITAL', 'ADMIN', 'DOCTOR'), RadiologyController.createImagingRequest);
router.get('/requests', authorize('HOSPITAL', 'ADMIN', 'RADIOLOGIST', 'DOCTOR'), RadiologyController.getImagingRequests);
router.get('/requests/:id', authorize('HOSPITAL', 'ADMIN', 'RADIOLOGIST', 'DOCTOR'), RadiologyController.getImagingRequestById);
router.patch('/requests/:id/status', authorize('HOSPITAL', 'ADMIN', 'RADIOLOGIST'), RadiologyController.updateStatus);
router.post('/requests/:id/report', authorize('HOSPITAL', 'ADMIN', 'RADIOLOGIST'), RadiologyController.submitReport);

export default router;