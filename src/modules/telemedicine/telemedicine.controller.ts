import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
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
  public async createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const { patientId: requestedPatientId, doctorId, consultationType, scheduledStartTime, chiefComplaint, followUpOfSessionId } = req.body;
      const patientId = authReq.user.userType === 'PATIENT' ? authReq.user._id : requestedPatientId;

      const session = await telemedicineService.createSession({
        hospitalId,
        patientId,
        doctorId,
        consultationType: consultationType as ConsultationType,
        scheduledStartTime,
        chiefComplaint,
        followUpOfSessionId,
      });

      res.status(201).json({ success: true, data: session });
    } catch (error) {
      next(error);
    }
  }

  public async getDirectory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const isPatient = authReq.user.userType === 'PATIENT';
      const isStaff = authReq.user.userType === 'STAFF';
      if (!authReq.user.hospitalId || !Types.ObjectId.isValid(authReq.user.hospitalId)) {
        res.status(403).json({
          success: false,
          message: 'Connect your patient portal account to a hospital before opening the telemedicine directory.',
        });
        return;
      }
      const result = await telemedicineService.getDirectory(authReq.user.hospitalId, !isPatient && !isStaff);
      res.status(200).json({ success: true, data: result });
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

      const { status, clinicalNotes, recordingUrl } = req.body;
      if (authReq.user.userType === 'PATIENT' && status !== ConsultationStatus.CANCELLED) {
        res.status(403).json({ success: false, message: 'Patients may cancel a consultation but cannot change its clinical status.' });
        return;
      }

      const patientId = authReq.user.userType === 'PATIENT' ? authReq.user._id : undefined;
      const doctorId = authReq.user.userType === 'STAFF' ? authReq.user._id : undefined;
      const updated = await telemedicineService.updateSessionStatus(id, hospitalId, {
        status: status as ConsultationStatus,
        clinicalNotes: patientId ? undefined : clinicalNotes,
        recordingUrl: patientId ? undefined : recordingUrl,
      }, patientId, doctorId);

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
      const senderModel = authReq.user.userType === 'PATIENT' ? 'Patient' : 'User';

      const message = await telemedicineService.sendMessage({
        hospitalId,
        sessionId,
        senderId,
        senderModel: senderModel || 'User',
        senderRole: String(authReq.user.userType || 'ACCOUNT'),
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
      res.status(200).json({ success: true, data: messages });
    } catch (error) {
      next(error);
    }
  }
}

export const telemedicineController = new TelemedicineController();