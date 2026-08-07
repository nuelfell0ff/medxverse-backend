import { Router } from 'express';
import { inventoryController } from './inventory.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

// Supplier Management Routes
router.post('/suppliers', (req, res, next) =>
  inventoryController.createSupplier(req, res, next)
);
router.get('/suppliers', (req, res, next) =>
  inventoryController.getSuppliers(req, res, next)
);

// Stock & Medical Supplies Routes
router.post('/items', (req, res, next) =>
  inventoryController.createInventoryItem(req, res, next)
);
router.get('/items', (req, res, next) =>
  inventoryController.getInventoryItems(req, res, next)
);

// Procurement & Purchase Orders Routes
router.post('/purchase-orders', (req, res, next) =>
  inventoryController.createPurchaseOrder(req, res, next)
);
router.get('/purchase-orders', (req, res, next) =>
  inventoryController.getPurchaseOrders(req, res, next)
);

// Equipment & Maintenance Routes
router.post('/equipment', (req, res, next) =>
  inventoryController.createEquipment(req, res, next)
);
router.get('/equipment', (req, res, next) =>
  inventoryController.getEquipment(req, res, next)
);

export default router;