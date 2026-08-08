import { Router } from 'express';
import { bloodBankController } from './blood-bank.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
const router = Router();
router.use(authenticate);
// Inventory routes
router.post('/units', (req, res, next) => bloodBankController.addBloodUnit(req, res, next));
router.get('/units', (req, res, next) => bloodBankController.getBloodUnits(req, res, next));
// Transfusion request routes
router.post('/requests', (req, res, next) => bloodBankController.createTransfusionRequest(req, res, next));
router.get('/requests', (req, res, next) => bloodBankController.getTransfusionRequests(req, res, next));
router.get('/requests/:id', (req, res, next) => bloodBankController.getTransfusionRequestById(req, res, next));
router.patch('/requests/:id/crossmatch', (req, res, next) => bloodBankController.updateCrossmatch(req, res, next));
router.patch('/requests/:id/status', (req, res, next) => bloodBankController.updateRequestStatus(req, res, next));
export default router;
