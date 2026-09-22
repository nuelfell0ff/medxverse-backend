import { Router } from 'express';
import { tariffsController } from './tariffs.controller.js';
const router = Router();
router.get('/', (req, res, next) => {
    tariffsController.list(req, res).catch(next);
});
router.get('/stats', (req, res, next) => {
    tariffsController.stats(req, res).catch(next);
});
router.get('/:id', (req, res, next) => {
    tariffsController.getById(req, res).catch(next);
});
router.post('/', (req, res, next) => {
    tariffsController.create(req, res).catch(next);
});
router.patch('/:id', (req, res, next) => {
    tariffsController.update(req, res).catch(next);
});
router.patch('/:id/status', (req, res, next) => {
    tariffsController.setStatus(req, res).catch(next);
});
router.post('/quote', (req, res, next) => {
    tariffsController.quote(req, res).catch(next);
});
export default router;
