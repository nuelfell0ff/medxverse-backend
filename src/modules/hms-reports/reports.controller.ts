import { Request, Response, NextFunction } from 'express';
import { reportsService } from './reports.service.js';
import { ReportStatus, ReportType } from './reports.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hmoId: string;
    [key: string]: unknown;
  };
}

export class ReportsController {
  public async generateReport(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;
      const userId = authReq.user._id;

      const report = await reportsService.generateReport(hmoId, userId, req.body);
      res.status(201).json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  public async getReportHistory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const type = req.query.type as ReportType | undefined;
      const status = req.query.status as ReportStatus | undefined;

      const result = await reportsService.getReportHistory(hmoId, {
        page,
        limit,
        type,
        status,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async getReportById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;
      const id = req.params.id as string;

      const report = await reportsService.getReportById(id, hmoId);
      if (!report) {
        res.status(404).json({ success: false, message: 'Report not found' });
        return;
      }

      res.status(200).json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }
}

export const reportsController = new ReportsController();