import { Router } from 'express';
import { authenticateAccount, restrictTo } from '../../middlewares/auth.middleware.js';
import { GlobalSearchController } from './global-search.controller.js';
const router = Router();
router.get('/', authenticateAccount, restrictTo('HOSPITAL'), GlobalSearchController.search);
export default router;
