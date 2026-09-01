import { Router } from 'express';
import { LabController } from './lab.controller.js';
import { authenticate, } from '../../middlewares/auth.middleware.js';
const router = Router();
/* =========================================================
   AUTHENTICATION
========================================================= */
router.use(authenticate);
/* =========================================================
   PRICING CATALOGUES
========================================================= */
router.get('/pricing-catalogues', LabController.pricingCatalogues);
/* =========================================================
   ORDERS / DIGITAL REQUISITIONS / WORKLIST
========================================================= */
router.post('/', LabController.create);
router.get('/', LabController.list);
/* =========================================================
   SPECIMEN WORKFLOW
========================================================= */
router.patch('/:id/collect-sample', LabController.collectSample);
router.patch('/:id/accession', LabController.accessionSpecimen);
router.patch('/:id/reject-sample', LabController.rejectSample);
router.patch('/:id/recollect', LabController.recollectSample);
/* =========================================================
   BILLING
========================================================= */
router.post('/:id/billing/capture', LabController.captureBilling);
/* =========================================================
   RESULTS
========================================================= */
router.patch('/:id/results', LabController.submitResults);
router.patch('/:id/verify', LabController.verifyResults);
router.patch('/:id/authorize', LabController.authorizeResults);
router.patch('/:id/amend-results', LabController.amendResults);
router.patch('/:id/repeat-test', LabController.repeatTest);
/* =========================================================
   SINGLE ORDER

   IMPORTANT:
   Keep '/:id' LAST so routes such as:
   '/:id/results'
   '/:id/verify'
   '/:id/authorize'

   are not accidentally matched incorrectly.
========================================================= */
router.get('/:id', LabController.getById);
export default router;
