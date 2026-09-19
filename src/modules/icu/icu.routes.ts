import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { icuController } from './icu.controller.js';

const router = Router();

router.use(authenticate);

/**
 * ICU API
 *
 * Canonical admission-oriented routes used by the frontend:
 *   /icu/admissions
 *   /icu/admissions/:id
 *   /icu/admissions/:id/...
 *
 * The original short routes are retained below for backwards compatibility.
 */

// -----------------------------------------------------------------------------
// Canonical admission routes
// -----------------------------------------------------------------------------

router.post('/admissions', (req, res, next) =>
  icuController.createAdmission(req, res, next),
);

router.get('/admissions', (req, res, next) =>
  icuController.getAdmissions(req, res, next),
);

router.get('/admissions/:id/dashboard', (req, res, next) =>
  icuController.getDashboard(req, res, next),
);

router.get('/admissions/:id', (req, res, next) =>
  icuController.getAdmissionById(req, res, next),
);

router.patch('/admissions/:id/vitals', (req, res, next) =>
  icuController.updateVitals(req, res, next),
);

router.patch('/admissions/:id/ventilator', (req, res, next) =>
  icuController.updateVentilatorSettings(req, res, next),
);

router.patch('/admissions/:id/status', (req, res, next) =>
  icuController.updateStatus(req, res, next),
);

router.post('/admissions/:id/device-readings', (req, res, next) =>
  icuController.ingestDeviceReading(req, res, next),
);

router.get('/admissions/:id/device-readings', (req, res, next) =>
  icuController.getDeviceReadings(req, res, next),
);

router.get('/admissions/:id/trends', (req, res, next) =>
  icuController.getTrends(req, res, next),
);

router.get('/admissions/:id/flowsheet', (req, res, next) =>
  icuController.getFlowsheet(req, res, next),
);

router.post('/admissions/:id/flowsheet', (req, res, next) =>
  icuController.addFlowsheetEntry(req, res, next),
);

router.patch('/admissions/:id/flowsheet/:entryId/confirm', (req, res, next) =>
  icuController.confirmFlowsheetEntry(req, res, next),
);

router.post('/admissions/:id/scores/recalculate', (req, res, next) =>
  icuController.recalculateScores(req, res, next),
);

router.post('/admissions/:id/scores/recalculate-from-data', (req, res, next) =>
  icuController.recalculateScoresFromData(req, res, next),
);

router.get('/admissions/:id/scores', (req, res, next) =>
  icuController.getScores(req, res, next),
);

router.post('/admissions/:id/family-communications', (req, res, next) =>
  icuController.addFamilyCommunication(req, res, next),
);

router.get('/admissions/:id/family-communications', (req, res, next) =>
  icuController.getFamilyCommunications(req, res, next),
);

// -----------------------------------------------------------------------------
// Legacy routes
//
// These remain available so existing consumers of the original ICU API are
// not broken while the frontend uses the canonical /admissions/... paths.
// -----------------------------------------------------------------------------

router.get('/dashboard/:id', (req, res, next) =>
  icuController.getDashboard(req, res, next),
);

router.post('/', (req, res, next) =>
  icuController.createAdmission(req, res, next),
);

router.get('/', (req, res, next) =>
  icuController.getAdmissions(req, res, next),
);

router.get('/:id', (req, res, next) =>
  icuController.getAdmissionById(req, res, next),
);

router.patch('/:id/vitals', (req, res, next) =>
  icuController.updateVitals(req, res, next),
);

router.patch('/:id/ventilator', (req, res, next) =>
  icuController.updateVentilatorSettings(req, res, next),
);

router.patch('/:id/status', (req, res, next) =>
  icuController.updateStatus(req, res, next),
);

router.post('/:id/device-readings', (req, res, next) =>
  icuController.ingestDeviceReading(req, res, next),
);

router.get('/:id/device-readings', (req, res, next) =>
  icuController.getDeviceReadings(req, res, next),
);

router.get('/:id/trends', (req, res, next) =>
  icuController.getTrends(req, res, next),
);

router.get('/:id/flowsheet', (req, res, next) =>
  icuController.getFlowsheet(req, res, next),
);

router.post('/:id/flowsheet', (req, res, next) =>
  icuController.addFlowsheetEntry(req, res, next),
);

router.patch('/:id/flowsheet/:entryId/confirm', (req, res, next) =>
  icuController.confirmFlowsheetEntry(req, res, next),
);

router.post('/:id/scores/recalculate', (req, res, next) =>
  icuController.recalculateScores(req, res, next),
);

router.post('/:id/scores/recalculate-from-data', (req, res, next) =>
  icuController.recalculateScoresFromData(req, res, next),
);

router.get('/:id/scores', (req, res, next) =>
  icuController.getScores(req, res, next),
);

router.post('/:id/family-communications', (req, res, next) =>
  icuController.addFamilyCommunication(req, res, next),
);

router.get('/:id/family-communications', (req, res, next) =>
  icuController.getFamilyCommunications(req, res, next),
);

export default router;
