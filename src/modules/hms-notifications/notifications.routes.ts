import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { Router } from 'express';
import { notificationsController } from './notifications.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize('HMO', 'HMO_ADMIN', 'HMO_CLAIMS_OFFICER', 'HMO_MEDICAL_OFFICER', 'HMO_OFFICER'));

router.post('/', notificationsController.createNotification);
router.get('/', notificationsController.getUserNotifications);
router.get('/unread-count', notificationsController.getUnreadCount);
router.patch('/read-all', notificationsController.markAllAsRead);
router.get('/:id', notificationsController.getNotificationById);
router.patch('/:id/read', notificationsController.markAsRead);

export default router;
