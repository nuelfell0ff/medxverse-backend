import { Router } from 'express';
import { mchController } from './mch.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/', (req, res, next) => mchController.createRecord(req, res, next));
router.get('/', (req, res, next) => mchController.getRecords(req, res, next));
router.get('/:id', (req, res, next) => mchController.getRecordById(req, res, next));
router.post('/:id/anc-visits', (req, res, next) => mchController.addAncVisit(req, res, next));
router.post('/:id/delivery', (req, res, next) => mchController.recordDelivery(req, res, next));
router.post('/:id/immunizations', (req, res, next) => mchController.addImmunization(req, res, next));

export default router;