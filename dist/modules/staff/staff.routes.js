import { Router } from 'express';
import { StaffController } from './staff.controller.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
const router = Router();
// Protect all staff routes & ensure only HOSPITAL accounts can manage staff
router.use(protect, restrictTo('HOSPITAL'));
router.route('/')
    .post(StaffController.createStaff)
    .get(StaffController.getStaff);
router.route('/:id')
    .get(StaffController.getStaffById)
    .patch(StaffController.updateStaff);
router.patch('/:id/toggle-status', StaffController.toggleStaffStatus);
export default router;
