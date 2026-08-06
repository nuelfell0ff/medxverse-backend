import { Request, Response, NextFunction } from 'express';
import { OPDService } from './opd.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export class OPDController {
  /**
   * Check in patient to OPD queue
   * POST /api/v1/opd/check-in
   */
  static async createVisit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const visit = await OPDService.createVisit(req.body, req.user!.organizationId);
      res.status(201).json(new ApiResponse(201, visit, 'Patient checked in to OPD queue'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Record patient vitals
   * POST /api/v1/opd/:id/vitals
   */
  static async recordVitals(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const visit = await OPDService.recordVitals(
        req.params.id,
        req.body,
        req.user!.id,
        req.user!.organizationId
      );
      res.status(200).json(new ApiResponse(200, visit, 'Patient vitals recorded successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Start consultation
   * PATCH /api/v1/opd/:id/start-consultation
   */
  static async startConsultation(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const visit = await OPDService.startConsultation(
        req.params.id,
        req.user!.id,
        req.user!.organizationId
      );
      res.status(200).json(new ApiResponse(200, visit, 'Consultation session started'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete consultation
   * POST /api/v1/opd/:id/complete
   */
  static async completeConsultation(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const visit = await OPDService.completeConsultation(
        req.params.id,
        req.body,
        req.user!.id,
        req.user!.organizationId
      );
      res.status(200).json(new ApiResponse(200, visit, 'Consultation completed successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get OPD Queue / List
   * GET /api/v1/opd
   */
  static async getQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        doctorId: req.query.doctorId as string,
        status: req.query.status as any,
        priority: req.query.priority as any,
        date: req.query.date as string,
        search: req.query.search as string,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      };

      const result = await OPDService.getQueue(req.user!.organizationId, filters);
      res.status(200).json(new ApiResponse(200, result, 'OPD queue retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get OPD Visit Details
   * GET /api/v1/opd/:id
   */
  static async getVisitById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const visit = await OPDService.getVisitById(req.params.id, req.user!.organizationId);
      res.status(200).json(new ApiResponse(200, visit, 'OPD visit record retrieved'));
    } catch (error) {
      next(error);
    }
  }
}