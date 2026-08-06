import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router = Router();

// Public Authentication Routes
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refreshToken);

// Protected Auth Routes
router.get('/me', protect, AuthController.me);

export default router;