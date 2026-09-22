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
      const preAuth = await preAuthorizationsService.createPreAuth({
        ...req.body,
        hmoId: authReq.user.hmoId,
      });
      res.status(201).json({ success: true, data: preAuth });
    } catch (error) { next(error); }
  }

  public async getPreAuths(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await preAuthorizationsService.getPreAuths(authReq.user.hmoId, {
        page: req.query.page ? parseInt(String(req.query.page), 10) : 1,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 20,
        status: req.query.status as PreAuthStatus | undefined,
        priority: req.query.priority as PreAuthPriority | undefined,
        memberId: req.query.memberId as string | undefined,
        providerId: req.query.providerId as string | undefined,
        search: req.query.search as string | undefined,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  public async getPreAuthById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const preAuth = await preAuthorizationsService.getPreAuthById(req.params.id, authReq.user.hmoId);
      if (!preAuth) {
        res.status(404).json({ success: false, message: 'Pre-authorization request not found' });
        return;
      }
      res.status(200).json({ success: true, data: preAuth });
    } catch (error) { next(error); }
  }

  public async reviewPreAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const updated = await preAuthorizationsService.reviewPreAuth(
        req.params.id,
        authReq.user.hmoId,
        authReq.user._id,
        req.body
      );
      if (!updated) {
        res.status(404).json({ success: false, message: 'Pre-authorization request not found' });
        return;
      }
      res.status(200).json({ success: true, data: updated });
    } catch (error) { next(error); }
  }

  public async getPreAuthStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const stats = await preAuthorizationsService.getPreAuthStats(authReq.user.hmoId);
      res.status(200).json({ success: true, data: stats });
    } catch (error) { next(error); }
  }
}

export const preAuthorizationsController = new PreAuthorizationsController();
