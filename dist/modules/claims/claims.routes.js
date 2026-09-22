import { Router } from 'express';
import { claimsController } from './claims.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
const router = Router();
router.use(authenticate);
router.use(authorize('HMO', 'HMO_ADMIN', 'HMO_CLAIMS_OFFICER', 'HMO_MEDICAL_OFFICER', 'HMO_OFFICER'));
// Claims endpoints
router.post('/', (req, res, next) => claimsController.createClaim(req, res, next));
router.get('/', (req, res, next) => claimsController.getClaims(req, res, next));
router.get('/member/:memberId', (req, res, next) => claimsController.getMemberClaims(req, res, next));
router.get('/:id', (req, res, next) => claimsController.getClaimById(req, res, next));
router.patch('/:id/status', (req, res, next) => claimsController.updateClaimStatus(req, res, next));
export default router;
