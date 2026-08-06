import { Router } from 'express';
import { PharmacyController } from './pharmacy.controller.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(protect, restrictTo('HOSPITAL'));

// Inventory Routes
router.route('/medications')
  .post(PharmacyController.createMedication)
  .get(PharmacyController.getMedications);

router.post('/medications/:id/batches', PharmacyController.addStockBatch);

// Prescription Routes
router.route('/prescriptions')
  .post(PharmacyController.createPrescription)
  .get(PharmacyController.getPrescriptions);

router.post('/prescriptions/:id/dispense', PharmacyController.dispensePrescription);

export default router;