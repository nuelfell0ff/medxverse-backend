import { Request, Response, NextFunction } from 'express';
import { hmsDashboardService } from './hms-dashboard.service.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hmoId: string;
    [key: string]: unknown;
  };
}

export class HmsDashboardController {
  public async getDashboardMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId || (req.query.hmoId as string);

      const metrics = await hmsDashboardService.getDashboardMetrics(hmoId);

      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  public async getDashboardSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;

      const settings = await hmsDashboardService.getDashboardSettings(hmoId);

      res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  public async updateDashboardSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;

      const updated = await hmsDashboardService.updateDashboardSettings(hmoId, req.body);

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const hmsDashboardController = new HmsDashboardController();