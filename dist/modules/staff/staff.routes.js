import { Router } from 'express';
import { StaffController } from './staff.controller.js';
import { protect, restrictTo, } from '../../middlewares/auth.middleware.js';
const router = Router();
/**
 * All staff endpoints require authentication.
 */
router.use(protect);
/**
 * Staff dashboard.
 *
 * Must come before /:id.
 */
router.get('/dashboard', restrictTo('HOSPITAL', 'ADMIN'), StaffController.getDashboard);
/**
 * Credential expiry monitoring.
 */
router.get('/credentials/expiring', restrictTo('HOSPITAL', 'ADMIN'), StaffController.getExpiringCredentials);
/**
 * Staff directory/list.
 *
 * Healthcare workers can be visible to authorized
 * clinical users for internal lookup.
 */
router
    .route('/')
    .get(restrictTo('HOSPITAL', 'ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'), StaffController.getStaff)
    .post(restrictTo('HOSPITAL', 'ADMIN'), StaffController.createStaff);
/**
 * Single staff profile.
 */
router
    .route('/:id')
    .get(restrictTo('HOSPITAL', 'ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'), StaffController.getStaffById)
    .patch(restrictTo('HOSPITAL', 'ADMIN'), StaffController.updateStaff);
/**
 * Activate/deactivate staff.
 */
router.patch('/:id/toggle-status', restrictTo('HOSPITAL', 'ADMIN'), StaffController.toggleStaffStatus);
export default router;
