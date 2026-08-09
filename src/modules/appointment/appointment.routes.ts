import { Router } from 'express';
import { AppointmentController } from './appointment.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js'; // Adjust path to match your folder structure

const router = Router();

// Protect all appointment endpoints (decodes JWT & attaches hospitalId to req)
router.use(authenticate);

router.post('/', AppointmentController.create);
router.get('/', AppointmentController.list);
router.get('/:id', AppointmentController.getById);
router.patch('/:id/status', AppointmentController.updateStatus);

export default router;
