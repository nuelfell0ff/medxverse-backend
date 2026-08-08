import { Request, Response, NextFunction } from 'express';
import { claimsService } from './claims.service.js';
import { ClaimStatus } from './claims.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hmoId: string;
    [key: string]: unknown;
  };
}

export class ClaimsController {
  public async createClaim(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;

      const claim = await claimsService.createClaim(hmoId, req.body);
      res.status(201).json({ success: true, data: claim });
    } catch (error) {
      next(error);
    }
  }

  public async getClaims(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const status = req.query.status as ClaimStatus | undefined;
      const memberId = req.query.memberId as string | undefined;
      const providerId = req.query.providerId as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const search = req.query.search as string | undefined;

      const result = await claimsService.getClaims(hmoId, {
        page,
        limit,
        status,
        memberId,
        providerId,
        startDate,
        endDate,
        search,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async getClaimById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;
      const id = req.params.id as string;

      const claim = await claimsService.getClaimById(id, hmoId);
      if (!claim) {
        res.status(404).json({ success: false, message: 'Claim not found' });
        return;
      }

      res.status(200).json({ success: true, data: claim });
    } catch (error) {
      next(error);
    }
  }

  public async updateClaimStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;
      const userId = authReq.user._id;
      const id = req.params.id as string;

      const updated = await claimsService.updateClaimStatus(id, hmoId, userId, req.body);
      if (!updated) {
        res.status(404).json({ success: false, message: 'Claim not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async getMemberClaims(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;
      const memberId = req.params.memberId as string;

      const claims = await claimsService.getMemberClaims(memberId, hmoId);
      res.status(200).json({ success: true, data: claims });
    } catch (error) {
      next(error);
    }
  }
}

export const claimsController = new ClaimsController();