import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { Router } from 'express';
import { providerController } from './provider.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize('HMO', 'HMO_ADMIN', 'HMO_CLAIMS_OFFICER', 'HMO_MEDICAL_OFFICER', 'HMO_OFFICER'));

router.post('/', providerController.createProvider);
router.get('/', providerController.getProviders);
router.get('/:id', providerController.getProviderById);
router.patch('/:id', providerController.updateProvider);

export default router;
