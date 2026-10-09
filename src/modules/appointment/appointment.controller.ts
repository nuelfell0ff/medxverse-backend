import { Request, Response, NextFunction } from 'express';
import { AppointmentService } from './appointment.service.js';
import { StaffUser } from '../staff-auth/staff-user.model.js';
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
    userType?: string;
    role?: string;
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

  /**
   * Doctor accounts are scoped to their own appointments. Front-desk and
   * authorized hospital account users retain the existing hospital-wide view.
   */
  private static async doctorScope(
    req: Request,
    hospitalId: string,
  ): Promise<{ isDoctor: boolean; doctorId?: string }> {
    const user = (req as AuthenticatedRequest).user;
    const role = String(user?.role || '').toLowerCase();
    const isDoctor =
      user?.userType === 'STAFF' &&
      /doctor|physician|specialist|consultant/.test(role);

    if (!isDoctor) return { isDoctor: false };

    if (!user?._id) return { isDoctor: true };

    // Staff login tokens identify the StaffUser record, while appointments
    // reference the clinical Staff record. Resolve the link before querying.
    const staffUser = await StaffUser.findOne({
      _id: user._id,
      hospitalId,
      isActive: true,
      status: 'ACTIVE',
    })
      .select('staffId')
      .lean()
      .exec();

    return {
      isDoctor: true,
      ...(staffUser?.staffId ? { doctorId: String(staffUser.staffId) } : {}),
    };
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

      const scope = await AppointmentController.doctorScope(req, h);
      if (scope.isDoctor && !scope.doctorId) {
        res.status(403).json({
          success: false,
          message: 'Your staff account is not linked to a clinical staff profile.',
        });
        return;
      }

      res.json({
        success: true,
        ...(await AppointmentService.getAppointments(
          h,
          {
            ...(req.query as GetAppointmentsQueryDTO),
            ...(scope.isDoctor ? { doctorId: scope.doctorId } : {}),
          },
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

      const scope = await AppointmentController.doctorScope(req, h);
      if (scope.isDoctor && !scope.doctorId) {
        res.status(403).json({
          success: false,
          message: 'Your staff account is not linked to a clinical staff profile.',
        });
        return;
      }

      res.json({
        success: true,
        data: await AppointmentService.getAppointmentById(
          h,
          req.params.id,
          scope.isDoctor ? scope.doctorId : undefined,
        ),
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
