import { Router } from 'express';
import { PharmacyController } from './pharmacy.controller.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import { UserRole } from '../../constants/roles.enum.js';

const router = Router();

// Protect all pharmacy routes
router.use(protect);

// Inventory queries
router.get('/inventory', PharmacyController.getInventory);
router.get('/inventory/:id', PharmacyController.getDrugById);

// Inventory management (Pharmacist, Admins)
router.post(
  '/inventory',
  restrictTo(
    UserRole.SYSTEM_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.PHARMACIST
  ),
  PharmacyController.addDrug
);

router.patch(
  '/inventory/:id',
  restrictTo(
    UserRole.SYSTEM_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.PHARMACIST
  ),
  PharmacyController.updateDrug
);

// Dispensing workflow (Pharmacists)
router.post(
  '/dispense',
  restrictTo(
    UserRole.SYSTEM_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.PHARMACIST
  ),
  PharmacyController.dispensePrescription
);

router.get(
  '/dispense-history',
  restrictTo(
    UserRole.SYSTEM_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.PHARMACIST
  ),
  PharmacyController.getDispenseHistory
);

export default router;