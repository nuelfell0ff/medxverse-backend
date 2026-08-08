import { Router } from 'express';
import { claimsController } from './claims.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
const router = Router();
router.use(authenticate);
// Claims endpoints
router.post('/', (req, res, next) => claimsController.createClaim(req, res, next));
router.get('/', (req, res, next) => claimsController.getClaims(req, res, next));
router.get('/:id', (req, res, next) => claimsController.getClaimById(req, res, next));
router.patch('/:id/status', (req, res, next) => claimsController.updateClaimStatus(req, res, next));
router.get('/member/:memberId', (req, res, next) => claimsController.getMemberClaims(req, res, next));
export default router;
