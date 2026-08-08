import { Request, Response, NextFunction } from 'express';
import { preAuthorizationsService } from './pre-authorizations.service.js';
import { PreAuthStatus, PreAuthPriority } from './pre-authorizations.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hmoId: string;
    [key: string]: unknown;
  };
}

export class PreAuthorizationsController {
  public async createPreAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;

      const preAuth = await preAuthorizationsService.createPreAuth({
        ...req.body,
        hmoId,
      });

      res.status(201).json({ success: true, data: preAuth });
    } catch (error) {
      next(error);
    }
  }

  public async getPreAuths(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const status = req.query.status as PreAuthStatus | undefined;
      const priority = req.query.priority as PreAuthPriority | undefined;
      const memberId = req.query.memberId as string | undefined;
      const providerId = req.query.providerId as string | undefined;
      const search = req.query.search as string | undefined;

      const result = await preAuthorizationsService.getPreAuths(hmoId, {
        page,
        limit,
        status,
        priority,
        memberId,
        providerId,
        search,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async getPreAuthById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;
      const id = req.params.id as string;

      const preAuth = await preAuthorizationsService.getPreAuthById(id, hmoId);
      if (!preAuth) {
        res.status(404).json({ success: false, message: 'Pre-authorization request not found' });
        return;
      }

      res.status(200).json({ success: true, data: preAuth });
    } catch (error) {
      next(error);
    }
  }

  public async reviewPreAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;
      const reviewerId = authReq.user._id;
      const id = req.params.id as string;

      const updated = await preAuthorizationsService.reviewPreAuth(
        id,
        hmoId,
        reviewerId,
        req.body
      );

      if (!updated) {
        res.status(404).json({ success: false, message: 'Pre-authorization request not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async getPreAuthStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;

      const stats = await preAuthorizationsService.getPreAuthStats(hmoId);
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
}

export const preAuthorizationsController = new PreAuthorizationsController();