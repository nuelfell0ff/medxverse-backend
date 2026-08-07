import { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service.js';

export class DashboardController {
  static async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as unknown as { user: { hospitalId?: string; id: string } }).user;
      const hospitalId = user.hospitalId || user.id;

      const metrics = await DashboardService.getExecutiveMetrics(hospitalId);
      
      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error: unknown) {
      next(error);
    }
  }
}