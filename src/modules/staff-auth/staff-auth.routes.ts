import { Router } from 'express';
import { StaffAuthController } from './staff-auth.controller.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';

const router = Router();

// Public invitation activation endpoints.
router.get('/invitation/:token', StaffAuthController.previewInvitation);
router.post('/invitation/accept', StaffAuthController.acceptInvitation);
router.post('/login', StaffAuthController.login);
router.post(
  '/account/:staffId',
  protect,
  restrictTo('HOSPITAL', 'HOSPITAL_ADMIN', 'ADMIN', 'SYSTEM_ADMIN'),
  StaffAuthController.createManualAccount
);


// Existing hospital administrators can issue invitations from the staff page.
router.post(
  '/invite/:staffId',
  protect,
  restrictTo('HOSPITAL', 'HOSPITAL_ADMIN', 'ADMIN', 'SYSTEM_ADMIN'),
  StaffAuthController.createInvitation
);

export default router;
