import { Router } from 'express';
import { StaffController } from './staff.controller.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
const router = Router();
// Require authentication for all staff routes
router.use(protect);
// GET / - Read staff list (accessible to Hospital admins, Receptionists, Doctors, and Nurses for lookups)
// POST / - Create staff (restricted to Hospital account admins)
router
    .route('/')
    .get(restrictTo('HOSPITAL', 'ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'), StaffController.getStaff)
    .post(restrictTo('HOSPITAL', 'ADMIN'), StaffController.createStaff);
// GET /:id - Read single staff detail
// PATCH /:id - Update staff details (restricted to Hospital admins)
router
    .route('/:id')
    .get(restrictTo('HOSPITAL', 'ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'), StaffController.getStaffById)
    .patch(restrictTo('HOSPITAL', 'ADMIN'), StaffController.updateStaff);
// Toggle active/inactive status (restricted to Hospital admins)
router.patch('/:id/toggle-status', restrictTo('HOSPITAL', 'ADMIN'), StaffController.toggleStaffStatus);
export default router;
