import { Router } from 'express';
import { tariffsController } from './tariffs.controller.js';
import { authenticateAccount } from '../../middlewares/auth.middleware.js';
const router = Router();
// All tariff endpoints require an authenticated account.
// The controller resolves the HMO tenant from req.user / req.account.
router.use(authenticateAccount);
// List tariffs
router.get('/', (req, res, next) => {
    tariffsController.list(req, res).catch(next);
});
// Tariff statistics
router.get('/stats', (req, res, next) => {
    tariffsController.stats(req, res).catch(next);
});
// Quote an active tariff.
// IMPORTANT: Keep this BEFORE /:id so "quote" is not treated as a tariff ID.
router.post('/quote', (req, res, next) => {
    tariffsController.quote(req, res).catch(next);
});
// Create tariff
router.post('/', (req, res, next) => {
    tariffsController.create(req, res).catch(next);
});
// Get tariff by ID
router.get('/:id', (req, res, next) => {
    tariffsController.getById(req, res).catch(next);
});
// Update tariff
router.patch('/:id', (req, res, next) => {
    tariffsController.update(req, res).catch(next);
});
// Update tariff status
router.patch('/:id/status', (req, res, next) => {
    tariffsController.setStatus(req, res).catch(next);
});
export default router;
