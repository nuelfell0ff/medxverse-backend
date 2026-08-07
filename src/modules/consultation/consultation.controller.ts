import { Request, Response, NextFunction } from 'express';
import { ConsultationService } from './consultation.service.js';
import {
  CreateConsultationDTO,
  UpdateConsultationDTO,
  GetConsultationsQueryDTO,
} from './consultation.types.js';

interface AuthenticatedRequest<Params = Record<string, string>, ResBody = any, ReqBody = any, ReqQuery = any>
  extends Request<Params, ResBody, ReqBody, ReqQuery> {
  user?: {
    id: string;
    hospitalId?: string;
  };
}

export class ConsultationController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest<{}, any, CreateConsultationDTO>;
      const user = authReq.user!;
      const hospitalId = user.hospitalId || user.id;
      const doctorId = user.id;

      const consultation = await ConsultationService.createConsultation(
        hospitalId,
        doctorId,
        authReq.body
      );

      res.status(201).json({
        success: true,
        data: consultation,
      });
    } catch (error: unknown) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest<{}, any, any, GetConsultationsQueryDTO>;
      const user = authReq.user!;
      const hospitalId = user.hospitalId || user.id;

      const result = await ConsultationService.getConsultations(hospitalId, authReq.query);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error: unknown) {
      next(error);
    }
  }

  static async getById(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as unknown as AuthenticatedRequest<{ id: string }>;
      const user = authReq.user!;
      const hospitalId = user.hospitalId || user.id;
      const consultationId = req.params.id;

      const consultation = await ConsultationService.getConsultationById(hospitalId, consultationId);

      res.status(200).json({
        success: true,
        data: consultation,
      });
    } catch (error: unknown) {
      next(error);
    }
  }

  static async update(
    req: Request<{ id: string }, any, UpdateConsultationDTO>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as unknown as AuthenticatedRequest<{ id: string }, any, UpdateConsultationDTO>;
      const user = authReq.user!;
      const hospitalId = user.hospitalId || user.id;
      const consultationId = req.params.id;

      const updated = await ConsultationService.updateConsultation(
        hospitalId,
        consultationId,
        authReq.body
      );

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: unknown) {
      next(error);
    }
  }
}