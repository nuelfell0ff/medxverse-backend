import { Router } from 'express';
import { notificationController } from './notifications.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
const router = Router();
// Apply authentication middleware to all notification endpoints
router.use(authenticate);
router.get('/', (req, res, next) => notificationController.getMyNotifications(req, res, next));
router.get('/unread-count', (req, res, next) => notificationController.getUnreadCount(req, res, next));
router.post('/', (req, res, next) => notificationController.createNotification(req, res, next));
router.patch('/read-all', (req, res, next) => notificationController.markAllAsRead(req, res, next));
router.patch('/:id/read', (req, res, next) => notificationController.markAsRead(req, res, next));
router.delete('/:id', (req, res, next) => notificationController.deleteNotification(req, res, next));
export default router;
