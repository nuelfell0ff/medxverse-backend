import { Request, Response, NextFunction } from 'express';
import { AppointmentService } from './appointment.service.js';
import {
  CreateAppointmentDTO,
  UpdateAppointmentStatusDTO,
  GetAppointmentsQueryDTO,
  RescheduleAppointmentDTO,
  CreateScheduleDTO,
  CheckInDTO,
  CreateWalkInQueueDTO,
  QueueTicketStatus,
  QueueQueryDTO,
} from './appointment.types.js';

interface AuthenticatedRequest extends Request {
  account?: {
    id?: string;
    accountId?: string;
    hospitalId?: string;
    hospital?: string;
    _id?: string;
  };
  user?: {
    id?: string;
    accountId?: string;
    hospitalId?: string;
    hospital?: string;
    _id?: string;
  };
}

export class AppointmentController {
  private static getHospitalId(req: Request): string | null {
    const authenticated = req as AuthenticatedRequest;
    const account = authenticated.account;
    const user = authenticated.user;

    const hospitalId =
      account?.hospitalId ??
      account?.hospital ??
      account?.accountId ??
      account?.id ??
      account?._id ??
      user?.hospitalId ??
      user?.hospital ??
      user?.accountId ??
      user?.id ??
      user?._id ??
      null;

    return hospitalId ? String(hospitalId) : null;
  }

  private static hospital(req: Request, res: Response): string | null {
    const hospitalId = this.getHospitalId(req);

    if (!hospitalId) {
      res.status(401).json({
        statusCode: 401,
        success: false,
        message: 'Authenticated hospital context is missing.',
        errors: [],
      });
      return null;
    }

    return hospitalId;
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const h = AppointmentController.hospital(req, res);
      if (!h) return;

      res.status(201).json({
        success: true,
        data: await AppointmentService.createAppointment(
          h,
          req.body as CreateAppointmentDTO,
        ),
      });
    } catch (e) {
      next(e);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const h = AppointmentController.hospital(req, res);
      if (!h) return;

      res.json({
        success: true,
        ...(await AppointmentService.getAppointments(
          h,
          req.query as GetAppointmentsQueryDTO,
        )),
      });
    } catch (e) {
      next(e);
    }
  }

  static async getById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = AppointmentController.hospital(req, res);
      if (!h) return;

      res.json({
        success: true,
        data: await AppointmentService.getAppointmentById(h, req.params.id),
      });
    } catch (e) {
      next(e);
    }
  }

  static async updateStatus(
    req: Request<{ id: string }, any, UpdateAppointmentStatusDTO>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = AppointmentController.hospital(req, res);
      if (!h) return;

      res.json({
        success: true,
        data: await AppointmentService.updateStatus(
          h,
          req.params.id,
          req.body,
        ),
      });
    } catch (e) {
      next(e);
    }
  }

  static async reschedule(
    req: Request<{ id: string }, any, RescheduleAppointmentDTO>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = AppointmentController.hospital(req, res);
      if (!h) return;

      res.json({
        success: true,
        data: await AppointmentService.reschedule(
          h,
          req.params.id,
          req.body,
        ),
      });
    } catch (e) {
      next(e);
    }
  }

  static async cancel(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = AppointmentController.hospital(req, res);
      if (!h) return;

      res.json({
        success: true,
        data: await AppointmentService.cancel(
          h,
          req.params.id,
          req.body?.notes,
        ),
      });
    } catch (e) {
      next(e);
    }
  }

  static async createSchedule(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = AppointmentController.hospital(req, res);
      if (!h) return;

      res.json({
        success: true,
        data: await AppointmentService.createOrUpdateSchedule(
          h,
          req.body as CreateScheduleDTO,
        ),
      });
    } catch (e) {
      next(e);
    }
  }

  static async getSchedule(
    req: Request<{ providerId: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = AppointmentController.hospital(req, res);
      if (!h) return;

      res.json({
        success: true,
        data: await AppointmentService.getSchedule(h, req.params.providerId),
      });
    } catch (e) {
      next(e);
    }
  }

  static async checkIn(
    req: Request<{ id: string }, any, CheckInDTO>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = AppointmentController.hospital(req, res);
      if (!h) return;

      res.status(201).json({
        success: true,
        data: await AppointmentService.checkIn(
          h,
          req.params.id,
          req.body || {},
        ),
      });
    } catch (e) {
      next(e);
    }
  }

  static async walkIn(req: Request, res: Response, next: NextFunction) {
    try {
      const h = AppointmentController.hospital(req, res);
      if (!h) return;

      res.status(201).json({
        success: true,
        data: await AppointmentService.createWalkInQueue(
          h,
          req.body as CreateWalkInQueueDTO,
        ),
      });
    } catch (e) {
      next(e);
    }
  }

  static async queue(req: Request, res: Response, next: NextFunction) {
    try {
      const h = AppointmentController.hospital(req, res);
      if (!h) return;

      res.json({
        success: true,
        ...(await AppointmentService.getQueue(
          h,
          req.query as QueueQueryDTO,
        )),
      });
    } catch (e) {
      next(e);
    }
  }

  static async queueTicket(
    req: Request<{ ticketId: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = AppointmentController.hospital(req, res);
      if (!h) return;

      res.json({
        success: true,
        data: await AppointmentService.updateQueueTicket(
          h,
          req.params.ticketId,
          req.body.status as QueueTicketStatus,
          req.body.delayMinutes,
        ),
      });
    } catch (e) {
      next(e);
    }
  }

  static async providerDelay(
    req: Request<{ providerId: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = AppointmentController.hospital(req, res);
      if (!h) return;

      res.json({
        success: true,
        ...(await AppointmentService.updateProviderDelay(
          h,
          req.params.providerId,
          Number(req.body.delayMinutes) || 0,
          req.body.department,
        )),
      });
    } catch (e) {
      next(e);
    }
  }

  static async risk(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = AppointmentController.hospital(req, res);
      if (!h) return;

      res.json({
        success: true,
        data: await AppointmentService.getRisk(h, req.params.id),
      });
    } catch (e) {
      next(e);
    }
  }

  static async dueReminders(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = AppointmentController.hospital(req, res);
      if (!h) return;

      res.json({
        success: true,
        data: await AppointmentService.getDueReminders(
          h,
          Number(req.query.limit) || 100,
        ),
      });
    } catch (e) {
      next(e);
    }
  }

  static async markReminderSent(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = AppointmentController.hospital(req, res);
      if (!h) return;

      res.json({
        success: true,
        data: await AppointmentService.markReminderSent(
          h,
          req.params.id,
        ),
      });
    } catch (e) {
      next(e);
    }
  }
}
