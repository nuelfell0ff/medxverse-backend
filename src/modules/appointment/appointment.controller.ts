import { Request, Response, NextFunction } from 'express';
import { AppointmentService } from './appointment.service.js';
import {
  CreateAppointmentDTO,
  UpdateAppointmentStatusDTO,
  GetAppointmentsQueryDTO,
} from './appointment.types.js';

interface AuthenticatedRequest<Params = Record<string, string>, ResBody = any, ReqBody = any, ReqQuery = any>
  extends Request<Params, ResBody, ReqBody, ReqQuery> {
  user?: {
    id: string;
    hospitalId?: string;
  };
}

export class AppointmentController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest<{}, any, CreateAppointmentDTO>;
      const user = authReq.user!;
      const hospitalId = user.hospitalId || user.id;

      const appointment = await AppointmentService.createAppointment(hospitalId, authReq.body);

      res.status(201).json({
        success: true,
        data: appointment,
      });
    } catch (error: unknown) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest<{}, any, any, GetAppointmentsQueryDTO>;
      const user = authReq.user!;
      const hospitalId = user.hospitalId || user.id;

      const result = await AppointmentService.getAppointments(hospitalId, authReq.query);

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
      const appointmentId = req.params.id;

      const appointment = await AppointmentService.getAppointmentById(hospitalId, appointmentId);

      res.status(200).json({
        success: true,
        data: appointment,
      });
    } catch (error: unknown) {
      next(error);
    }
  }

  static async updateStatus(
    req: Request<{ id: string }, any, UpdateAppointmentStatusDTO>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as unknown as AuthenticatedRequest<{ id: string }, any, UpdateAppointmentStatusDTO>;
      const user = authReq.user!;
      const hospitalId = user.hospitalId || user.id;
      const appointmentId = req.params.id;

      const updated = await AppointmentService.updateStatus(hospitalId, appointmentId, authReq.body);

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: unknown) {
      next(error);
    }
  }
}