import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { telemedicineService } from './telemedicine.service.js';
import { ConsultationType, ConsultationStatus } from './telemedicine.types.js';
import { StaffUser } from '../staff-auth/staff-user.model.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hospitalId: string;
    [key: string]: unknown;
  };
}

export class TelemedicineController {
  private async clinicalStaffId(authReq: AuthenticatedRequest): Promise<string | undefined> {
    if (authReq.user.userType !== 'STAFF') return undefined;

    const staffUser = await StaffUser.findOne({
      _id: authReq.user._id,
      hospitalId: authReq.user.hospitalId,
      isActive: true,
      status: 'ACTIVE',
    })
      .select('staffId')
      .lean()
      .exec();

    return staffUser?.staffId ? String(staffUser.staffId) : undefined;
  }

  public async createSessionFromAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      if (!hospitalId || authReq.user.userType === 'PATIENT') {
        res.status(403).json({
          success: false,
          message: 'Only authorized hospital staff can open a consultation from an appointment.',
        });
        return;
      }

      const isStaff = authReq.user.userType === 'STAFF';
      const staffId = isStaff ? await this.clinicalStaffId(authReq) : undefined;
      if (isStaff && !staffId) {
        res.status(403).json({
          success: false,
          message: 'Your staff account is not linked to a clinical staff profile.',
        });
        return;
      }

      const session = await telemedicineService.createSessionForAppointment(
        hospitalId,
        req.params.appointmentId as string,
        staffId,
      );

      res.status(200).json({ success: true, data: session });
    } catch (error) {
      next(error);
    }
  }

  public async createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const { patientId: requestedPatientId, doctorId: requestedDoctorId, consultationType, scheduledStartTime, chiefComplaint, followUpOfSessionId } = req.body;
      const patientId = authReq.user.userType === 'PATIENT' ? authReq.user._id : requestedPatientId;
      let doctorId = requestedDoctorId as string;

      if (authReq.user.userType === 'STAFF') {
        const clinicalStaffId = await this.clinicalStaffId(authReq);
        if (!clinicalStaffId) {
          res.status(403).json({
            success: false,
            message: 'Your staff account is not linked to a clinical staff profile.',
          });
          return;
        }
        if (doctorId && doctorId !== clinicalStaffId) {
          res.status(403).json({
            success: false,
            message: 'You can only create consultations assigned to you.',
          });
          return;
        }
        doctorId = clinicalStaffId;
      }

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
      const isStaff = authReq.user.userType === 'STAFF';
      const clinicalStaffId = isStaff ? await this.clinicalStaffId(authReq) : undefined;
      if (isStaff && !clinicalStaffId) {
        res.status(403).json({
          success: false,
          message: 'Your staff account is not linked to a clinical staff profile.',
        });
        return;
      }
      const doctorId = isStaff ? clinicalStaffId : req.query.doctorId as string | undefined;
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
      const isStaff = authReq.user.userType === 'STAFF';
      const doctorId = isStaff ? await this.clinicalStaffId(authReq) : undefined;
      if (isStaff && !doctorId) {
        res.status(403).json({
          success: false,
          message: 'Your staff account is not linked to a clinical staff profile.',
        });
        return;
      }
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
      const isStaff = authReq.user.userType === 'STAFF';
      const doctorId = isStaff ? await this.clinicalStaffId(authReq) : undefined;
      if (isStaff && !doctorId) {
        res.status(403).json({
          success: false,
          message: 'Your staff account is not linked to a clinical staff profile.',
        });
        return;
      }
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
      const isStaff = authReq.user.userType === 'STAFF';
      const doctorId = isStaff ? await this.clinicalStaffId(authReq) : undefined;
      if (isStaff && !doctorId) {
        res.status(403).json({
          success: false,
          message: 'Your staff account is not linked to a clinical staff profile.',
        });
        return;
      }
      const messages = await telemedicineService.getSessionMessages(sessionId, hospitalId, patientId, doctorId);
      res.status(200).json({ success: true, data: messages });
    } catch (error) {
      next(error);
    }
  }
}

export const telemedicineController = new TelemedicineController();