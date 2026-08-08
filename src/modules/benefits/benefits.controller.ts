import { Request, Response, NextFunction } from 'express';
import { benefitsService } from './benefits.service.js';
import { PackageStatus } from './benefits.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hmoId: string;
    [key: string]: unknown;
  };
}

export class BenefitsController {
  public async createPackage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;

      const pkg = await benefitsService.createPackage(hmoId, req.body);
      res.status(201).json({ success: true, data: pkg });
    } catch (error) {
      next(error);
    }
  }

  public async getPackages(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const status = req.query.status as PackageStatus | undefined;
      const tier = req.query.tier as string | undefined;
      const search = req.query.search as string | undefined;

      const result = await benefitsService.getPackages(hmoId, {
        page,
        limit,
        status,
        tier,
        search,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async getPackageById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;
      const id = req.params.id as string;

      const pkg = await benefitsService.getPackageById(id, hmoId);
      if (!pkg) {
        res.status(404).json({ success: false, message: 'Benefit package not found' });
        return;
      }

      res.status(200).json({ success: true, data: pkg });
    } catch (error) {
      next(error);
    }
  }

  public async updatePackage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;
      const id = req.params.id as string;

      const updated = await benefitsService.updatePackage(id, hmoId, req.body);
      if (!updated) {
        res.status(404).json({ success: false, message: 'Benefit package not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}

export const benefitsController = new BenefitsController();