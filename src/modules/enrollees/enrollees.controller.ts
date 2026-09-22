import { Request, Response, NextFunction } from 'express';

import { enrolleesService } from './enrollees.service.js';
import {
  EnrolleeRelationship,
  EnrolleeStatus,
} from './enrollees.types.js';

interface AuthContext {
  account?: {
    accountId?: string;
    accountType?: string;
  };
  user?: {
    _id?: string;
    accountId?: string;
    hmoId?: string;
    accountType?: string;
    [key: string]: unknown;
  };
}

const resolveHmoId = (req: Request): string => {
  const auth = req as Request & AuthContext;
  const hmoId = auth.user?.hmoId || auth.user?.accountId || auth.account?.accountId;
  if (!hmoId) {
    throw Object.assign(new Error('Authenticated HMO account could not be resolved'), { statusCode: 401 });
  }
  return hmoId;
};

const resolveActorId = (req: Request): string | undefined => {
  const auth = req as Request & AuthContext;
  return auth.user?._id;
};

export class EnrolleesController {
  public async createEnrollee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const enrollee = await enrolleesService.createEnrollee(resolveHmoId(req), req.body, resolveActorId(req));
      res.status(201).json({ success: true, data: enrollee });
    } catch (error) {
      next(error);
    }
  }

  public async getEnrollees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? Number.parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? Number.parseInt(String(req.query.limit), 10) : 20;

      const result = await enrolleesService.getEnrollees(resolveHmoId(req), {
        page,
        limit,
        status: req.query.status as EnrolleeStatus | undefined,
        benefitPlanId: req.query.benefitPlanId as string | undefined,
        relationship: req.query.relationship as EnrolleeRelationship | undefined,
        search: req.query.search as string | undefined,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await enrolleesService.getStats(resolveHmoId(req));
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  public async getEnrolleeById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const enrollee = await enrolleesService.getEnrolleeById(
        String(req.params.id),
        resolveHmoId(req)
      );

      if (!enrollee) {
        res.status(404).json({ success: false, message: 'Enrollee not found' });
        return;
      }

      res.status(200).json({ success: true, data: enrollee });
    } catch (error) {
      next(error);
    }
  }

  public async updateEnrollee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await enrolleesService.updateEnrollee(
        String(req.params.id),
        resolveHmoId(req),
        req.body,
        resolveActorId(req)
      );

      if (!updated) {
        res.status(404).json({ success: false, message: 'Enrollee not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.body?.status as EnrolleeStatus | undefined;
      if (!status) {
        res.status(400).json({ success: false, message: 'Status is required' });
        return;
      }

      const updated = await enrolleesService.updateEnrolleeStatus(
        String(req.params.id),
        resolveHmoId(req),
        { status, reason: req.body?.reason },
        resolveActorId(req)
      );

      if (!updated) {
        res.status(404).json({ success: false, message: 'Enrollee not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async getDependents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dependents = await enrolleesService.getDependents(
        String(req.params.id),
        resolveHmoId(req)
      );

      res.status(200).json({ success: true, data: dependents });
    } catch (error) {
      next(error);
    }
  }

  public async renewEnrollee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await enrolleesService.renewEnrollee(
        String(req.params.id),
        resolveHmoId(req),
        req.body,
        resolveActorId(req),
      );
      if (!updated) { res.status(404).json({ success: false, message: 'Enrollee not found' }); return; }
      res.status(200).json({ success: true, data: updated, message: 'Enrollee renewed successfully' });
    } catch (error) { next(error); }
  }

  public async getCard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const card = await enrolleesService.getCard(String(req.params.id), resolveHmoId(req), resolveActorId(req));
      if (!card) { res.status(404).json({ success: false, message: 'Enrollee not found' }); return; }
      res.status(200).json({ success: true, data: card });
    } catch (error) { next(error); }
  }

  public async getLifecycle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const events = await enrolleesService.getLifecycle(String(req.params.id), resolveHmoId(req));
      res.status(200).json({ success: true, data: events });
    } catch (error) { next(error); }
  }

  public async checkEligibility(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const eligibility = await enrolleesService.checkEligibility(
        String(req.params.id),
        resolveHmoId(req),
        req.query.date ? new Date(String(req.query.date)) : new Date()
      );

      res.status(200).json({ success: true, data: eligibility });
    } catch (error) {
      next(error);
    }
  }
}

export const enrolleesController = new EnrolleesController();
