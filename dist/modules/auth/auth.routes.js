import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authenticateAccount } from '../../middlewares/auth.middleware.js';
const router = Router();
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/me', authenticateAccount, AuthController.me);
export default router;
