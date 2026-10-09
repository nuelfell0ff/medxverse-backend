import { Request, Response, NextFunction } from 'express';
import { telemedicineService } from './telemedicine.service.js';
import { ConsultationType, ConsultationStatus } from './telemedicine.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hospitalId: string;
    [key: string]: unknown;
  };
}

export class TelemedicineController {
  private async canStaffAccessSession(
    authReq: AuthenticatedRequest,
    sessionId: string,
    hospitalId: string
  ): Promise<boolean> {
    const user = authReq.user;
    if (user.userType !== 'STAFF') return true;

    const role = String(user.role || '').toUpperCase();
    if (['HOSPITAL_ADMIN', 'ADMIN', 'SYSTEM_ADMIN'].includes(role)) return true;

    const session = await telemedicineService.getSessionById(sessionId, hospitalId);
    if (!session) return false;
    const doctor = session.doctorId as unknown as { _id?: unknown } | string;
    const doctorId = typeof doctor === 'string' ? doctor : String(doctor?._id || '');
    return doctorId === String(user._id);
  }

  public async createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const { patientId: requestedPatientId, doctorId, consultationType, scheduledStartTime, chiefComplaint, followUpOfSessionId } = req.body;
      const patientId = authReq.user.userType === 'PATIENT' ? authReq.user._id : requestedPatientId;
      const { patientId, doctorId, consultationType, scheduledStartTime, chiefComplaint } = req.body;

      const session = await telemedicineService.createSession({
        hospitalId,
        patientId,
        doctorId,
        consultationType: consultationType as ConsultationType,
        scheduledStartTime,
        chiefComplaint,
      });

      res.status(201).json({ success: true, data: session });
    } catch (error) {
      next(error);
    }
  }

  public async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const patientId = authReq.user.userType === 'PATIENT' ? authReq.user._id : req.query.patientId as string | undefined;
      const doctorId = authReq.user.userType === 'STAFF' ? authReq.user._id : req.query.doctorId as string | undefined;
      const patientId = req.query.patientId as string | undefined;
      const requestedDoctorId = req.query.doctorId as string | undefined;
      const doctorId = authReq.user.userType === 'STAFF'
        ? authReq.user._id
        : requestedDoctorId;
      const status = req.query.status as ConsultationStatus | undefined;
      const consultationType = req.query.consultationType as ConsultationType | undefined;

      const result = await telemedicineService.getSessions(hospitalId, {
        page,
        limit,
        patientId,
        doctorId,
        status,
        consultationType,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async getSessionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const patientId = authReq.user.userType === 'PATIENT' ? authReq.user._id : undefined;
      const doctorId = authReq.user.userType === 'STAFF' ? authReq.user._id : undefined;
      const session = await telemedicineService.getSessionById(id, hospitalId, patientId, doctorId);
      const session = await telemedicineService.getSessionById(id, hospitalId);

      if (!session) {
        res.status(404).json({ success: false, message: 'Telemedicine session not found' });
        return;
      }

      res.status(200).json({ success: true, data: session });
    } catch (error) {
      next(error);
    }
  }

  public async updateSessionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      if (!(await this.canStaffAccessSession(authReq, id, hospitalId))) {
        res.status(403).json({ success: false, message: 'You are not assigned to this patient consultation.' });
        return;
      }

      const patientId = authReq.user.userType === 'PATIENT' ? authReq.user._id : undefined;
      const doctorId = authReq.user.userType === 'STAFF' ? authReq.user._id : undefined;
      const { status, clinicalNotes, recordingUrl } = req.body;

      const updated = await telemedicineService.updateSessionStatus(id, hospitalId, {
        status: status as ConsultationStatus,
        clinicalNotes,
        recordingUrl,
      });

      if (!updated) {
        res.status(404).json({ success: false, message: 'Telemedicine session not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const senderId = authReq.user._id;

      const { sessionId, messageText, attachmentUrl } = req.body;
      if (!sessionId || !(await this.canStaffAccessSession(authReq, String(sessionId), hospitalId))) {
        res.status(403).json({ success: false, message: 'You are not assigned to this patient consultation.' });
        return;
      }

      const message = await telemedicineService.sendMessage({
        hospitalId,
        sessionId,
        senderId,
        senderModel: String(authReq.user.userType || '').toUpperCase() === 'PATIENT' ? 'Patient' : 'User',
        messageText,
        attachmentUrl,
      });

      res.status(201).json({ success: true, data: message });
    } catch (error) {
      next(error);
    }
  }

  public async getSessionMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const sessionId = req.params.sessionId as string;

      const patientId = authReq.user.userType === 'PATIENT' ? authReq.user._id : undefined;
      const doctorId = authReq.user.userType === 'STAFF' ? authReq.user._id : undefined;
      const messages = await telemedicineService.getSessionMessages(sessionId, hospitalId, patientId, doctorId);
      if (!(await this.canStaffAccessSession(authReq, sessionId, hospitalId))) {
        res.status(403).json({ success: false, message: 'You are not assigned to this patient consultation.' });
        return;
      }

      const messages = await telemedicineService.getSessionMessages(sessionId, hospitalId);
      res.status(200).json({ success: true, data: messages });
    } catch (error) {
      next(error);
    }
  }
}

export const telemedicineController = new TelemedicineController();