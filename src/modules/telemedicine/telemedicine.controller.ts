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
  public async createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

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
      const patientId = req.query.patientId as string | undefined;
      const doctorId = req.query.doctorId as string | undefined;
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

      const { sessionId, senderModel, messageText, attachmentUrl } = req.body;

      const message = await telemedicineService.sendMessage({
        hospitalId,
        sessionId,
        senderId,
        senderModel: senderModel || 'User',
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

      const messages = await telemedicineService.getSessionMessages(sessionId, hospitalId);
      res.status(200).json({ success: true, data: messages });
    } catch (error) {
      next(error);
    }
  }
}

export const telemedicineController = new TelemedicineController();