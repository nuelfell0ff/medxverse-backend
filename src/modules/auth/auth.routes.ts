import { Router } from 'express';
import { registerOrgAndAdmin, login, getProfile } from './auth.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.post('/register-org', registerOrgAndAdmin);
router.post('/login', login);
router.get('/me', authenticate, getProfile);

export default router;