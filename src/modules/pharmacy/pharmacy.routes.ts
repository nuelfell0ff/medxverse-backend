import { Router } from 'express';
import { PharmacyController } from './pharmacy.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

// Inventory Management
router.post('/inventory', PharmacyController.createItem);
router.get('/inventory', PharmacyController.listInventory);
router.get('/inventory/:id', PharmacyController.getItemById);
router.patch('/inventory/:id/stock', PharmacyController.adjustStock);

// Dispensing Management
router.post('/dispense', PharmacyController.dispenseDrugs);
router.get('/dispense', PharmacyController.listDispenseRecords);

export default router;