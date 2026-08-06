import { Request, Response, NextFunction } from 'express';
import { RadiologyService } from './radiology.service.js';

export class RadiologyController {
  public static async createImagingRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = (req as any).user.hospitalId;
      const requestedBy = (req as any).user.id;
      const request = await RadiologyService.createImagingRequest(hospitalId, requestedBy, req.body);
      res.status(201).json({ success: true, data: request });
    } catch (error) {
      next(error);
    }
  }

  public static async getImagingRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = (req as any).user.hospitalId;
      const filters = {
        status: req.query.status as string,
        patientId: req.query.patientId as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      };
      const result = await RadiologyService.getImagingRequests(hospitalId, filters);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  public static async getImagingRequestById(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = (req as any).user.hospitalId;
      const request = await RadiologyService.getImagingRequestById(req.params.id as string, hospitalId);
      res.status(200).json({ success: true, data: request });
    } catch (error) {
      next(error);
    }
  }

  public static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = (req as any).user.hospitalId;
      const result = await RadiologyService.updateStatus(req.params.id as string, hospitalId, req.body.status);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async submitReport(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = (req as any).user.hospitalId;
      const userId = (req as any).user.id;
      const result = await RadiologyService.submitReport(req.params.id as string, hospitalId, {
        radiologistId: userId,
        findings: req.body.findings,
        impression: req.body.impression,
        imageUrls: req.body.imageUrls,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}