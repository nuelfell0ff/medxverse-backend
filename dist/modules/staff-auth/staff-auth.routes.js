import { Router } from 'express';
import { StaffAuthController } from './staff-auth.controller.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
const router = Router();
// Public invitation activation endpoints.
router.get('/invitation/:token', StaffAuthController.previewInvitation);
router.post('/invitation/accept', StaffAuthController.acceptInvitation);
router.post('/login', StaffAuthController.login);
router.get('/me', protect, StaffAuthController.me);
router.patch('/me', protect, StaffAuthController.updateProfile);
router.post('/change-password', protect, StaffAuthController.changePassword);
// Existing hospital administrators can issue invitations from the staff page.
router.post('/invite/:staffId', protect, restrictTo('HOSPITAL', 'HOSPITAL_ADMIN', 'ADMIN', 'SYSTEM_ADMIN'), StaffAuthController.createInvitation);
export default router;
