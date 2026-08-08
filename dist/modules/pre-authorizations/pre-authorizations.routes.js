import { Router } from 'express';
import { preAuthorizationsController } from './pre-authorizations.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
const router = Router();
router.use(authenticate);
// Pre-Authorization Queue & Stats
router.get('/stats', (req, res, next) => preAuthorizationsController.getPreAuthStats(req, res, next));
router.post('/', (req, res, next) => preAuthorizationsController.createPreAuth(req, res, next));
router.get('/', (req, res, next) => preAuthorizationsController.getPreAuths(req, res, next));
router.get('/:id', (req, res, next) => preAuthorizationsController.getPreAuthById(req, res, next));
// Decision & Clinical Review
router.patch('/:id/review', (req, res, next) => preAuthorizationsController.reviewPreAuth(req, res, next));
export default router;
