import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { Router } from 'express';
import { benefitsController } from './benefits.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize('HMO', 'HMO_ADMIN', 'HMO_CLAIMS_OFFICER', 'HMO_MEDICAL_OFFICER', 'HMO_OFFICER'));

router.post('/', benefitsController.createPackage);
router.get('/', benefitsController.getPackages);
router.get('/:id', benefitsController.getPackageById);
router.patch('/:id', benefitsController.updatePackage);

export default router;
