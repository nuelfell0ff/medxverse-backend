import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { healthPlansController } from './health-plans.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize('HMO', 'HMO_ADMIN', 'HMO_CLAIMS_OFFICER', 'HMO_MEDICAL_OFFICER', 'HMO_OFFICER'));

router.get('/stats', (req, res, next) => healthPlansController.planStats(req, res).catch(next));
router.post('/', (req, res, next) => healthPlansController.createPlan(req, res).catch(next));
router.get('/', (req, res, next) => healthPlansController.listPlans(req, res).catch(next));
router.get('/:id/benefits', (req, res, next) => healthPlansController.listPlanBenefits(req, res).catch(next));
router.post('/:id/benefits', (req, res, next) => healthPlansController.attachBenefit(req, res).catch(next));
router.delete('/:id/benefits/:benefitId', (req, res, next) => healthPlansController.detachBenefit(req, res).catch(next));
router.post('/:id/eligibility/check', (req, res, next) => healthPlansController.checkEligibility(req, res).catch(next));
router.patch('/:id/status', (req, res, next) => healthPlansController.setPlanStatus(req, res).catch(next));
router.get('/:id', (req, res, next) => healthPlansController.getPlan(req, res).catch(next));
router.patch('/:id', (req, res, next) => healthPlansController.updatePlan(req, res).catch(next));

export default router;
