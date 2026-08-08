import { Router } from 'express';
import { benefitsController } from './benefits.controller.js';

const router = Router();

router.post('/', benefitsController.createPackage);
router.get('/', benefitsController.getPackages);
router.get('/:id', benefitsController.getPackageById);
router.patch('/:id', benefitsController.updatePackage);

export default router;