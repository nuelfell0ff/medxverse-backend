import { Request, Response, NextFunction } from 'express';
import { claimsService } from './claims.service.js';
import { ClaimStatus } from './claims.types.js';

interface AuthenticatedRequest extends Request {
  user: { _id: string; hmoId: string; [key: string]: unknown };
}

const getAuthUser = (req: Request): AuthenticatedRequest['user'] => {
  const user = (req as AuthenticatedRequest).user;
  if (!user?.hmoId) throw new Error('Authenticated HMO context is missing');
  return user;
};

export class ClaimsController {
  public async createClaim(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthUser(req);
      const claim = await claimsService.createClaim(user.hmoId, req.body);
      res.status(201).json({ success: true, data: claim });
    } catch (error) { next(error); }
  }

  public async getClaims(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthUser(req);
      const rawPage = Number.parseInt(String(req.query.page ?? '1'), 10);
      const rawLimit = Number.parseInt(String(req.query.limit ?? '20'), 10);
      const result = await claimsService.getClaims(user.hmoId, {
        page: Number.isFinite(rawPage) ? rawPage : 1,
        limit: Number.isFinite(rawLimit) ? rawLimit : 20,
        status: req.query.status as ClaimStatus | undefined,
        memberId: req.query.memberId as string | undefined,
        providerId: req.query.providerId as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        search: req.query.search as string | undefined,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  public async getClaimById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthUser(req);
      const claim = await claimsService.getClaimById(req.params.id, user.hmoId);
      if (!claim) {
        res.status(404).json({ success: false, message: 'Claim not found' });
        return;
      }
      res.status(200).json({ success: true, data: claim });
    } catch (error) { next(error); }
  }

  public async updateClaimStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthUser(req);
      const updated = await claimsService.updateClaimStatus(
        req.params.id, user.hmoId, user._id, req.body
      );
      if (!updated) {
        res.status(404).json({ success: false, message: 'Claim not found' });
        return;
      }
      res.status(200).json({ success: true, data: updated });
    } catch (error) { next(error); }
  }

  public async submitAppeal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthUser(req);
      const updated = await claimsService.submitAppeal(req.params.id, user.hmoId, user._id, req.body);
      if (!updated) {
        res.status(404).json({ success: false, message: 'Claim not found' });
        return;
      }
      res.status(201).json({ success: true, data: updated });
    } catch (error) { next(error); }
  }

  public async resolveAppeal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthUser(req);
      const updated = await claimsService.resolveAppeal(req.params.id, user.hmoId, user._id, req.body);
      if (!updated) {
        res.status(404).json({ success: false, message: 'Claim not found' });
        return;
      }
      res.status(200).json({ success: true, data: updated });
    } catch (error) { next(error); }
  }

  public async createAdjustment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthUser(req);
      const updated = await claimsService.createAdjustment(req.params.id, user.hmoId, user._id, req.body);
      if (!updated) {
        res.status(404).json({ success: false, message: 'Claim not found' });
        return;
      }
      res.status(201).json({ success: true, data: updated });
    } catch (error) { next(error); }
  }

  public async getMemberClaims(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthUser(req);
      const claims = await claimsService.getMemberClaims(req.params.memberId, user.hmoId);
      res.status(200).json({ success: true, data: claims });
    } catch (error) { next(error); }
  }
}

export const claimsController = new ClaimsController();
