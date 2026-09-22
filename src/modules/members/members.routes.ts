import { Router } from 'express';
import { membersController } from './members.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(authorize('HMO', 'HMO_ADMIN', 'HMO_CLAIMS_OFFICER', 'HMO_MEDICAL_OFFICER', 'HMO_OFFICER'));

// Enrolment & Members endpoints
router.post('/', (req, res, next) =>
  membersController.createMember(req, res, next)
);

router.get('/', (req, res, next) =>
  membersController.getMembers(req, res, next)
);

router.get('/:id', (req, res, next) =>
  membersController.getMemberById(req, res, next)
);

router.patch('/:id', (req, res, next) =>
  membersController.updateMember(req, res, next)
);

router.patch('/:id/status', (req, res, next) =>
  membersController.updateMemberStatus(req, res, next)
);

router.get('/:id/dependents', (req, res, next) =>
  membersController.getDependents(req, res, next)
);

export default router;