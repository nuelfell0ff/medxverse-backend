import { Router } from 'express';

import * as controller from './rostering.controller.js';

import { protect } from '../../middlewares/auth.middleware.js';

const router = Router();

/* =========================================================
   ROSTERS
========================================================= */

router.post(
  '/',
  protect,
  controller.createRoster
);

router.get(
  '/',
  protect,
  controller.getRosters
);

router.get(
  '/:id',
  protect,
  controller.getRosterById
);

router.patch(
  '/:id',
  protect,
  controller.updateRoster
);

router.post(
  '/:id/publish',
  protect,
  controller.publishRoster
);

/* =========================================================
   SHIFTS
========================================================= */

router.post(
  '/shifts',
  protect,
  controller.createShift
);

router.patch(
  '/:rosterId/shifts/:shiftId',
  protect,
  controller.updateShift
);

router.post(
  '/:rosterId/shifts/:shiftId/staff',
  protect,
  controller.assignStaff
);

router.delete(
  '/:rosterId/shifts/:shiftId/staff/:staffId',
  protect,
  controller.removeStaff
);

router.post(
  '/:rosterId/shifts/:shiftId/staff/:staffId/accept',
  protect,
  controller.acceptShift
);

router.post(
  '/:rosterId/shifts/:shiftId/staff/:staffId/decline',
  protect,
  controller.declineShift
);

/* =========================================================
   OPEN SHIFTS
========================================================= */

router.get(
  '/shifts/open',
  protect,
  controller.getOpenShifts
);

/* =========================================================
   STAFF AVAILABILITY
========================================================= */

router.post(
  '/availability',
  protect,
  controller.setAvailability
);

router.get(
  '/availability/:staffId',
  protect,
  controller.getAvailability
);

/* =========================================================
   SHIFT SWAPS
========================================================= */

router.post(
  '/swaps',
  protect,
  controller.createShiftSwap
);

router.patch(
  '/swaps/:swapId/decision',
  protect,
  controller.approveShiftSwap
);

/* =========================================================
   HANDOVERS
========================================================= */

router.post(
  '/handovers',
  protect,
  controller.createHandover
);

router.post(
  '/handovers/:handoverId/complete',
  protect,
  controller.completeHandover
);


/* =========================================================
   SHIFT ATTENDANCE
========================================================= */

router.post(
  '/shifts/:shiftId/sign-in',
  protect,
  controller.signInToShift
);

router.post(
  '/shifts/:shiftId/sign-out',
  protect,
  controller.signOutOfShift
);

router.get(
  '/attendance/report',
  protect,
  controller.getAttendanceReport
);

/* =========================================================
   STAFF ROSTER
========================================================= */

router.get(
  '/staff/:staffId',
  protect,
  controller.getStaffRoster
);

export default router;