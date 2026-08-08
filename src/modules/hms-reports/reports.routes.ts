import { Router } from 'express';
import { reportsController } from './reports.controller.js';

const router = Router();

router.post('/generate', reportsController.generateReport);
router.get('/', reportsController.getReportHistory);
router.get('/:id', reportsController.getReportById);

export default router;