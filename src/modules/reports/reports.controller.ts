import { Request, Response, NextFunction } from 'express';
import { ReportsService } from './reports.service.js';
import { IDateRangeFilter, IReportQueryFilters } from './reports.types.js';

export class ReportsController {
  static async getExecutiveSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = (req as any).user.hospitalId as string;
      const summary = await ReportsService.getExecutiveSummary(hospitalId);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRevenueReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = (req as any).user.hospitalId as string;
      const filters = req.query as unknown as IDateRangeFilter;

      const report = await ReportsService.getRevenueReport(hospitalId, filters);

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBedOccupancyReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = (req as any).user.hospitalId as string;
      const report = await ReportsService.getBedOccupancyReport(hospitalId);

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPatientDemographics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = (req as any).user.hospitalId as string;
      const report = await ReportsService.getPatientDemographics(hospitalId);

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createSavedReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = (req as any).user.hospitalId as string;
      const userId = (req as any).user._id as string;

      const report = await ReportsService.createSavedReport(hospitalId, userId, req.body);

      res.status(201).json({
        success: true,
        message: 'Report snapshot saved successfully',
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSavedReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = (req as any).user.hospitalId as string;
      const filters = req.query as unknown as IReportQueryFilters;

      const result = await ReportsService.getSavedReports(hospitalId, filters);

      res.status(200).json({
        success: true,
        data: result.reports,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
}