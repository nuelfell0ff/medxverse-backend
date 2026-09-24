import { Router } from 'express';
import { HMOUtilizationController } from './hmo-utilization.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
const router = Router();
const controller = new HMOUtilizationController();
/**
 * Every utilization/fraud endpoint is tenant-scoped.
 * The authentication middleware populates req.user, which the
 * controller uses to resolve the authenticated HMO ID.
 */
router.use(authenticate);
router.get('/summary', controller.summary.bind(controller));
router.get('/events', controller.events.bind(controller));
router.post('/events', controller.createEvent.bind(controller));
router.get('/rules', controller.rules.bind(controller));
router.post('/rules', controller.createRule.bind(controller));
router.patch('/rules/:id', controller.updateRule.bind(controller));
router.post('/rules/run', controller.runRules.bind(controller));
router.get('/alerts', controller.alerts.bind(controller));
router.patch('/alerts/:id/review', controller.reviewAlert.bind(controller));
router.get('/cases', controller.cases.bind(controller));
router.post('/cases', controller.createCase.bind(controller));
router.patch('/cases/:id', controller.updateCase.bind(controller));
export default router;
