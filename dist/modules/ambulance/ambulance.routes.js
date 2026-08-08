import { Router } from 'express';
import { ambulanceController } from './ambulance.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
const router = Router();
router.use(authenticate);
// Fleet management routes
router.post('/', (req, res, next) => ambulanceController.addAmbulance(req, res, next));
router.get('/', (req, res, next) => ambulanceController.getAmbulances(req, res, next));
router.patch('/:id/status', (req, res, next) => ambulanceController.updateAmbulanceStatus(req, res, next));
// Dispatch & Trip request routes
router.post('/trips', (req, res, next) => ambulanceController.createTripRequest(req, res, next));
router.get('/trips', (req, res, next) => ambulanceController.getTripRequests(req, res, next));
router.get('/trips/:id', (req, res, next) => ambulanceController.getTripRequestById(req, res, next));
router.patch('/trips/:id/assign', (req, res, next) => ambulanceController.assignTrip(req, res, next));
router.patch('/trips/:id/status', (req, res, next) => ambulanceController.updateTripStatus(req, res, next));
export default router;
