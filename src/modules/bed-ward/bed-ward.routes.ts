import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { bedWardController } from './bed-ward.controller.js';

const router = Router();
router.use(authenticate);

router.get('/dashboard', (req, res, next) => bedWardController.getDashboard(req, res, next));
router.get('/wards', (req, res, next) => bedWardController.getWards(req, res, next));
router.post('/wards', (req, res, next) => bedWardController.createWard(req, res, next));

router.get('/beds', (req, res, next) => bedWardController.getBeds(req, res, next));
router.post('/beds', (req, res, next) => bedWardController.createBed(req, res, next));
router.get('/beds/:id', (req, res, next) => bedWardController.getBed(req, res, next));
router.get('/beds/:id/history', (req, res, next) => bedWardController.getHistory(req, res, next));
router.patch('/beds/:id/status', (req, res, next) => bedWardController.transitionBed(req, res, next));
router.post('/beds/:id/cleaning/complete', (req, res, next) => bedWardController.completeCleaning(req, res, next));
router.post('/beds/:id/assignment/release', (req, res, next) => bedWardController.releaseAssignment(req, res, next));

router.post('/matching/suggestions', (req, res, next) => bedWardController.suggest(req, res, next));
router.post('/assignments', (req, res, next) => bedWardController.confirmAssignment(req, res, next));

router.get('/transfers', (req, res, next) => bedWardController.getTransfers(req, res, next));
router.post('/transfers', (req, res, next) => bedWardController.createTransfer(req, res, next));
router.post('/transfers/:id/complete', (req, res, next) => bedWardController.completeTransfer(req, res, next));

router.get('/forecasts', (req, res, next) => bedWardController.getForecast(req, res, next));
router.post('/forecasts/generate', (req, res, next) => bedWardController.generateForecast(req, res, next));

export default router;
