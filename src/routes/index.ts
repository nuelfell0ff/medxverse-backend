import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';

const router = Router();

// Base v1 Health Check
router.get('/', (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'MedxVerse API v1 Ecosystem Operational',
  });
});

// Authentication & Identity Module
router.use('/auth', authRoutes);

export default router;