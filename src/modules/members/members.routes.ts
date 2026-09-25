import { Router } from 'express';
import { membersController } from './members.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(
  authorize(
    'HMO',
    'HMO_ADMIN',
    'HMO_CLAIMS_OFFICER',
    'HMO_MEDICAL_OFFICER',
    'HMO_OFFICER',
  ),
);

/**
 * Compatibility API for existing consumers that still use /members.
 * The canonical source of truth is the Enrollee Registry service.
 */
router.post('/', (req, res, next) =>
  membersController.createMember(req, res, next),
);

router.get('/', (req, res, next) =>
  membersController.getMembers(req, res, next),
);

router.get('/:id/eligibility', (req, res, next) =>
  membersController.checkEligibility(req, res, next),
);

router.get('/:id/dependents', (req, res, next) =>
  membersController.getDependents(req, res, next),
);

router.post('/:id/renew', (req, res, next) =>
  membersController.renewMember(req, res, next),
);

router.get('/:id/card', (req, res, next) =>
  membersController.getCard(req, res, next),
);

router.get('/:id/history', (req, res, next) =>
  membersController.getLifecycle(req, res, next),
);

router.patch('/:id/status', (req, res, next) =>
  membersController.updateMemberStatus(req, res, next),
);

router.patch('/:id', (req, res, next) =>
  membersController.updateMember(req, res, next),
);

router.get('/:id', (req, res, next) =>
  membersController.getMemberById(req, res, next),
);

export default router;
