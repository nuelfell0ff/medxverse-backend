import { Router } from 'express';
import { protect } from '../../middlewares/auth.middleware.js';
import { StaffNotificationsController } from './staff-notifications.controller.js';
const router = Router();
router.use(protect);
router.get('/', StaffNotificationsController.feed);
router.get('/unread-count', StaffNotificationsController.unreadCount);
export default router;
