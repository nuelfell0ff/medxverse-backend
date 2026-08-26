import { Router } from 'express';

import { radiologyController } from './radiology.controller.js';

import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

/*
|--------------------------------------------------------------------------
| Radiology Orders
|--------------------------------------------------------------------------
*/

router.post(
  '/',
  (req, res, next) =>
    radiologyController.createOrder(
      req,
      res,
      next
    )
);

router.get(
  '/pricing-catalogues',
  (req, res, next) =>
    radiologyController.getPricingCatalogues(
      req,
      res,
      next
    )
);

router.get(
  '/',
  (req, res, next) =>
    radiologyController.getOrders(
      req,
      res,
      next
    )
);

router.get(
  '/:id',
  (req, res, next) =>
    radiologyController.getOrderById(
      req,
      res,
      next
    )
);

router.patch(
  '/:id',
  (req, res, next) =>
    radiologyController.updateOrder(
      req,
      res,
      next
    )
);

/*
|--------------------------------------------------------------------------
| Scheduling
|--------------------------------------------------------------------------
*/

router.patch(
  '/:id/schedule',
  (req, res, next) =>
    radiologyController.scheduleOrder(
      req,
      res,
      next
    )
);

/*
|--------------------------------------------------------------------------
| Staff Assignment
|--------------------------------------------------------------------------
*/

router.patch(
  '/:id/staff',
  (req, res, next) =>
    radiologyController.assignStaff(
      req,
      res,
      next
    )
);

router.delete(
  '/:id/staff',
  (req, res, next) =>
    radiologyController.removeStaff(
      req,
      res,
      next
    )
);

/*
|--------------------------------------------------------------------------
| Examination Workflow
|--------------------------------------------------------------------------
*/

router.patch(
  '/:id/status',
  (req, res, next) =>
    radiologyController.updateExaminationStatus(
      req,
      res,
      next
    )
);

/*
|--------------------------------------------------------------------------
| Radiology Queue
|--------------------------------------------------------------------------
*/

router.patch(
  '/:id/queue',
  (req, res, next) =>
    radiologyController.updateQueue(
      req,
      res,
      next
    )
);

/*
|--------------------------------------------------------------------------
| PACS / DICOM
|--------------------------------------------------------------------------
*/

router.patch(
  '/:id/pacs',
  (req, res, next) =>
    radiologyController.updatePacsData(
      req,
      res,
      next
    )
);

/*
|--------------------------------------------------------------------------
| Patient Safety
|--------------------------------------------------------------------------
*/

router.patch(
  '/:id/contrast',
  (req, res, next) =>
    radiologyController.updateContrast(
      req,
      res,
      next
    )
);

router.patch(
  '/:id/pregnancy-screening',
  (req, res, next) =>
    radiologyController.updatePregnancyScreening(
      req,
      res,
      next
    )
);

router.patch(
  '/:id/radiation',
  (req, res, next) =>
    radiologyController.updateRadiationExposure(
      req,
      res,
      next
    )
);

/*
|--------------------------------------------------------------------------
| Reporting
|--------------------------------------------------------------------------
*/

router.patch(
  '/:id/report',
  (req, res, next) =>
    radiologyController.completeReport(
      req,
      res,
      next
    )
);

router.patch(
  '/:id/report/sign',
  (req, res, next) =>
    radiologyController.signReport(
      req,
      res,
      next
    )
);

router.patch(
  '/:id/report/amend',
  (req, res, next) =>
    radiologyController.amendReport(
      req,
      res,
      next
    )
);

router.patch(
  '/:id/report/critical-result',
  (req, res, next) =>
    radiologyController.updateCriticalResult(
      req,
      res,
      next
    )
);

/*
|--------------------------------------------------------------------------
| MedxVerse AI
|--------------------------------------------------------------------------
*/

/*
 *--------------------------------------------------------------------------
 * Billing
 *--------------------------------------------------------------------------
 */

router.post(
  '/:id/billing/capture',
  (req, res, next) =>
    radiologyController.captureBilling(
      req,
      res,
      next
    )
);

router.patch(
  '/:id/ai-analysis',
  (req, res, next) =>
    radiologyController.updateAIAnalysis(
      req,
      res,
      next
    )
);

/*
|--------------------------------------------------------------------------
| Cancellation
|--------------------------------------------------------------------------
*/

router.patch(
  '/:id/cancel',
  (req, res, next) =>
    radiologyController.cancelOrder(
      req,
      res,
      next
    )
);

export default router;
