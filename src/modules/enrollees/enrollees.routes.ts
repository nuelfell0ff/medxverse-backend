import { NextFunction, Request, Response, Router } from 'express';

import { authenticate } from '../../middlewares/auth.middleware.js';
import { enrolleesController } from './enrollees.controller.js';

const router = Router();

const requireHmoAccount = (req: Request, res: Response, next: NextFunction): void => {
  const auth = req as Request & {
    account?: { accountType?: string };
    user?: { accountType?: string };
  };

  const accountType = auth.account?.accountType || auth.user?.accountType;

  if (accountType !== 'HMO') {
    res.status(403).json({
      success: false,
      message: 'Forbidden. HMO account access is required.',
    });
    return;
  }

  next();
};

router.use(authenticate);
router.use(requireHmoAccount);

router.get('/stats', (req: Request, res: Response, next: NextFunction) =>
  enrolleesController.getStats(req, res, next)
);

router.post('/', (req: Request, res: Response, next: NextFunction) =>
  enrolleesController.createEnrollee(req, res, next)
);

router.get('/', (req: Request, res: Response, next: NextFunction) =>
  enrolleesController.getEnrollees(req, res, next)
);

router.get('/:id/eligibility', (req: Request, res: Response, next: NextFunction) =>
  enrolleesController.checkEligibility(req, res, next)
);

router.get('/:id/dependents', (req: Request, res: Response, next: NextFunction) =>
  enrolleesController.getDependents(req, res, next)
);

router.patch('/:id/status', (req: Request, res: Response, next: NextFunction) =>
  enrolleesController.updateStatus(req, res, next)
);

router.patch('/:id', (req: Request, res: Response, next: NextFunction) =>
  enrolleesController.updateEnrollee(req, res, next)
);

router.get('/:id', (req: Request, res: Response, next: NextFunction) =>
  enrolleesController.getEnrolleeById(req, res, next)
);

export default router;
