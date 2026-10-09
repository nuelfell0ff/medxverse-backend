import { Request, Response, NextFunction } from 'express';
import { telemedicineService } from './telemedicine.service.js';
import { StaffUser } from '../staff-auth/staff-user.model.js';
import { Staff } from '../staff/staff.model.js';
import { ConsultationType, ConsultationStatus } from './telemedicine.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hospitalId: string;
    [key: string]: unknown;
  };
}

/**
 * Staff login IDs and Staff directory IDs are different records in MedXVerse.
 * Telemedicine sessions store the Staff._id in doctorId, while staff JWTs carry
 * StaffUser._id. Resolve the linked Staff record before checking consultation
 * assignment or querying sessions.
 */
async function resolveStaffRecordId(authReq: AuthenticatedRequest): Promise<string | undefined> {
  if (authReq.user.userType !== 'STAFF') return undefined;

  const hospitalId = String(authReq.user.hospitalId || '');
  const loginId = String(authReq.user._id || '');
  if (!hospitalId || !loginId) return undefined;

  const staffUser = await StaffUser.findOne({ _id: loginId, hospitalId }).select('staffId').lean();
  if (staffUser?.staffId) return String(staffUser.staffId);

  // Backward compatibility for deployments where a legacy token contains Staff._id.
  const legacyStaff = await Staff.findOne({ _id: loginId, hospitalId }).select('_id').lean();
  return legacyStaff ? String(legacyStaff._id) : undefined;
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
      const staffRecordId = await resolveStaffRecordId(authReq);
      if (authReq.user.userType === 'STAFF' && !staffRecordId) {
        res.status(403).json({ success: false, message: 'Your staff login is not linked to a staff profile. Ask your hospital administrator to link it.' });
        return;
      }
      // Never trust a staff client's doctorId query parameter; scope to its linked Staff record.
      const doctorId = authReq.user.userType === 'STAFF' ? staffRecordId : req.query.doctorId as string | undefined;
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
      const doctorId = await resolveStaffRecordId(authReq);
      if (authReq.user.userType === 'STAFF' && !doctorId) {
        res.status(403).json({ success: false, message: 'Your staff login is not linked to a staff profile.' });
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
      const doctorId = await resolveStaffRecordId(authReq);
      if (authReq.user.userType === 'STAFF' && !doctorId) {
        res.status(403).json({ success: false, message: 'Your staff login is not linked to a staff profile.' });
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
      const { sessionId, messageText, attachmentUrl } = req.body;
      const senderModel = authReq.user.userType === 'PATIENT' ? 'Patient' : 'User';
      const staffRecordId = await resolveStaffRecordId(authReq);
      if (authReq.user.userType === 'STAFF' && !staffRecordId) {
        res.status(403).json({ success: false, message: 'Your staff login is not linked to a staff profile. Ask your hospital administrator to link it.' });
        return;
      }
      // Sessions assign doctorId to Staff._id, not StaffUser._id.
      const senderId = authReq.user.userType === 'STAFF' ? staffRecordId! : authReq.user._id;

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
      const doctorId = await resolveStaffRecordId(authReq);
      if (authReq.user.userType === 'STAFF' && !doctorId) {
        res.status(403).json({ success: false, message: 'Your staff login is not linked to a staff profile.' });
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