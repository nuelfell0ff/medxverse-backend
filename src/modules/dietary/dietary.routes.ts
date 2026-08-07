import { Router } from 'express';
import { dietaryController } from './dietary.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

// Dietary order routes
router.post('/orders', (req, res, next) => dietaryController.createDietaryOrder(req, res, next));
router.get('/orders', (req, res, next) => dietaryController.getDietaryOrders(req, res, next));
router.get('/orders/:id', (req, res, next) =>
  dietaryController.getDietaryOrderById(req, res, next)
);
router.patch('/orders/:id', (req, res, next) =>
  dietaryController.updateDietaryOrder(req, res, next)
);

// Meal delivery tracking routes
router.post('/deliveries', (req, res, next) =>
  dietaryController.createMealDelivery(req, res, next)
);
router.get('/deliveries', (req, res, next) =>
  dietaryController.getMealDeliveries(req, res, next)
);
router.patch('/deliveries/:id/status', (req, res, next) =>
  dietaryController.updateMealDeliveryStatus(req, res, next)
);

export default router;