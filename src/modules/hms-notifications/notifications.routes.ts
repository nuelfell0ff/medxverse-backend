import { Router } from 'express';
import { notificationsController } from './notifications.controller.js';

const router = Router();

router.post('/', notificationsController.createNotification);
router.get('/', notificationsController.getUserNotifications);
router.get('/unread-count', notificationsController.getUnreadCount);
router.patch('/read-all', notificationsController.markAllAsRead);
router.get('/:id', notificationsController.getNotificationById);
router.patch('/:id/read', notificationsController.markAsRead);

export default router;