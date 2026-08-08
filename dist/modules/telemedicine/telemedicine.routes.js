import { Router } from 'express';
import { telemedicineController } from './telemedicine.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
const router = Router();
router.use(authenticate);
// Telemedicine Consultation Sessions
router.post('/sessions', (req, res, next) => telemedicineController.createSession(req, res, next));
router.get('/sessions', (req, res, next) => telemedicineController.getSessions(req, res, next));
router.get('/sessions/:id', (req, res, next) => telemedicineController.getSessionById(req, res, next));
router.patch('/sessions/:id/status', (req, res, next) => telemedicineController.updateSessionStatus(req, res, next));
// Real-time Chat & In-Consultation Messaging
router.post('/messages', (req, res, next) => telemedicineController.sendMessage(req, res, next));
router.get('/messages/session/:sessionId', (req, res, next) => telemedicineController.getSessionMessages(req, res, next));
export default router;
