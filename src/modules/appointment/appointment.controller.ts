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
    id?: string;
    accountId?: string;
    hospitalId?: string;
    _id?: string;
  };
}

export class AppointmentController {
  private static getHospitalId(req: Request): string | null {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    return user?.hospitalId || user?.accountId || user?.id || user?._id || null;
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = AppointmentController.getHospitalId(req);
      if (!hospitalId) {
        res.status(400).json({
          success: false,
          message: 'Hospital ID not found in authentication context.',
        });
        return;
      }

      const appointment = await AppointmentService.createAppointment(hospitalId, req.body as CreateAppointmentDTO);

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
      const hospitalId = AppointmentController.getHospitalId(req);
      if (!hospitalId) {
        res.status(400).json({
          success: false,
          message: 'Hospital ID not found in authentication context.',
        });
        return;
      }

      const query = req.query as GetAppointmentsQueryDTO;
      const result = await AppointmentService.getAppointments(hospitalId, query);

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
      const hospitalId = AppointmentController.getHospitalId(req);
      const appointmentId = req.params.id;

      if (!hospitalId) {
        res.status(400).json({
          success: false,
          message: 'Hospital ID not found in authentication context.',
        });
        return;
      }

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
      const hospitalId = AppointmentController.getHospitalId(req);
      const appointmentId = req.params.id;

      if (!hospitalId) {
        res.status(400).json({
          success: false,
          message: 'Hospital ID not found in authentication context.',
        });
        return;
      }

      const updated = await AppointmentService.updateStatus(hospitalId, appointmentId, req.body);

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: unknown) {
      next(error);
    }
  }
}
