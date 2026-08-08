import { Router } from 'express';
import { providerController } from './provider.controller.js';

const router = Router();

router.post('/', providerController.createProvider);
router.get('/', providerController.getProviders);
router.get('/:id', providerController.getProviderById);
router.patch('/:id', providerController.updateProvider);

export default router;