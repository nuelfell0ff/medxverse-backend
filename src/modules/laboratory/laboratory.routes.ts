import { Router } from 'express';
import { LaboratoryController } from './laboratory.controller.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import { UserRole } from '../../constants/roles.enum.js';

const router = Router();

// Protect all lab routes
router.use(protect);

// Catalog routes
router.get('/catalog', LaboratoryController.getLabTestCatalog);
router.get('/catalog/:id', LaboratoryController.getLabTestCatalogById);

router.post(
  '/catalog',
  restrictTo(
    UserRole.SYSTEM_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.LAB_TECHNICIAN
  ),
  LaboratoryController.createLabTestCatalogItem
);

router.patch(
  '/catalog/:id',
  restrictTo(
    UserRole.SYSTEM_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.LAB_TECHNICIAN
  ),
  LaboratoryController.updateLabTestCatalogItem
);

// Order management
router.get('/orders', LaboratoryController.getLabOrders);
router.get('/orders/:id', LaboratoryController.getLabOrderById);

router.post(
  '/orders',
  restrictTo(
    UserRole.SYSTEM_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.DOCTOR
  ),
  LaboratoryController.createLabOrder
);

// Result recording
router.patch(
  '/orders/:orderId/items/:itemId',
  restrictTo(
    UserRole.SYSTEM_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.LAB_TECHNICIAN
  ),
  LaboratoryController.updateLabTestResult
);

export default router;