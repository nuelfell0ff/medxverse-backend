import { Request, Response, NextFunction } from 'express';
import { benefitsService } from './benefits.service.js';
import { PackageStatus } from './benefits.types.js';

interface AuthenticatedRequest extends Request {
  user?: {
    _id?: string;
    hmoId?: string;
    [key: string]: unknown;
  };
}

function getHmoId(req: Request): string {
  const hmoId = (req as AuthenticatedRequest).user?.hmoId;
  if (!hmoId) {
    throw Object.assign(new Error('Authenticated HMO context is missing'), {
      statusCode: 403,
    });
  }
  return hmoId;
}

function positiveInt(value: unknown, fallback: number): number {
  if (typeof value !== 'string' || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export class BenefitsController {
  public async createPackage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pkg = await benefitsService.createPackage(getHmoId(req), req.body);
      res.status(201).json({ success: true, data: pkg });
    } catch (error) {
      next(error);
    }
  }

  public async getPackages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawStatus = typeof req.query.status === 'string' ? req.query.status : undefined;
      const status = rawStatus && Object.values(PackageStatus).includes(rawStatus as PackageStatus)
        ? rawStatus as PackageStatus
        : undefined;

      if (rawStatus && !status) {
        res.status(400).json({
          success: false,
          message: `Invalid package status. Allowed values: ${Object.values(PackageStatus).join(', ')}`,
        });
        return;
      }

      const result = await benefitsService.getPackages(getHmoId(req), {
        page: positiveInt(req.query.page, 1),
        limit: positiveInt(req.query.limit, 20),
        status,
        tier: typeof req.query.tier === 'string' ? req.query.tier : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async getPackageById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pkg = await benefitsService.getPackageById(req.params.id, getHmoId(req));
      if (!pkg) {
        res.status(404).json({ success: false, message: 'Benefit package not found' });
        return;
      }
      res.status(200).json({ success: true, data: pkg });
    } catch (error) {
      next(error);
    }
  }

  public async updatePackage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await benefitsService.updatePackage(
        req.params.id,
        getHmoId(req),
        req.body
      );

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
