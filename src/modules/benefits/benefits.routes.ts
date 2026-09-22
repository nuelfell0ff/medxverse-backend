import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { benefitsController } from './benefits.controller.js';

const router = Router();

router.use(authenticate);
router.use(
  authorize(
    'HMO',
    'HMO_ADMIN',
    'HMO_CLAIMS_OFFICER',
    'HMO_MEDICAL_OFFICER',
    'HMO_OFFICER'
  )
);

router.post('/', benefitsController.createPackage.bind(benefitsController));
router.get('/', benefitsController.getPackages.bind(benefitsController));
router.get('/:id', benefitsController.getPackageById.bind(benefitsController));
router.patch('/:id', benefitsController.updatePackage.bind(benefitsController));

export default router;
