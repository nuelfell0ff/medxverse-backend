import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { enrolleesController } from './enrollees.controller.js';
const router = Router();
const requireHmoAccount = (req, res, next) => {
    const auth = req;
    const accountType = auth.account?.accountType || auth.user?.accountType;
    if (accountType !== 'HMO') {
        res.status(403).json({
            success: false,
            message: 'Forbidden. HMO account access is required.',
        });
        return;
    }
    next();
};
router.use(authenticate);
router.use(requireHmoAccount);
router.get('/stats', (req, res, next) => enrolleesController.getStats(req, res, next));
router.post('/', (req, res, next) => enrolleesController.createEnrollee(req, res, next));
router.get('/', (req, res, next) => enrolleesController.getEnrollees(req, res, next));
router.get('/:id/eligibility', (req, res, next) => enrolleesController.checkEligibility(req, res, next));
router.get('/:id/dependents', (req, res, next) => enrolleesController.getDependents(req, res, next));
router.patch('/:id/status', (req, res, next) => enrolleesController.updateStatus(req, res, next));
router.patch('/:id', (req, res, next) => enrolleesController.updateEnrollee(req, res, next));
router.get('/:id', (req, res, next) => enrolleesController.getEnrolleeById(req, res, next));
export default router;
