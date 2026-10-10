import { Request, Response, NextFunction } from 'express';
import { telemedicineService } from './telemedicine.service.js';
import { StaffUser } from '../staff-auth/staff-user.model.js';
import { Staff } from '../staff/staff.model.js';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env.js';
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

  /**
   * Creates a short-lived JaaS JWT for an authenticated participant.
   * The JaaS private key is used only on the backend and is never returned.
   */
  public async getMeetingToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const configuredAppId = env.JAAS_APP_ID?.trim();
      const configuredApiKeyId = env.JAAS_API_KEY_ID?.trim();
      const privateKey = env.JAAS_PRIVATE_KEY;

      if (!configuredAppId || !configuredApiKeyId || !privateKey) {
        res.status(503).json({
          success: false,
          message: 'JaaS is not configured. Set JAAS_APP_ID, JAAS_API_KEY_ID, and JAAS_PRIVATE_KEY on the backend.',
        });
        return;
      }

      // JaaS displays API key IDs as "APP_ID/KEY_SUFFIX". Accept either that
      // complete key ID or just the suffix in JAAS_API_KEY_ID, and always use
      // the bare AppID for the JWT "sub" claim and room namespace.
      const appId = configuredAppId.split('/')[0];
      const kid = configuredApiKeyId.includes('/')
        ? configuredApiKeyId
        : `${appId}/${configuredApiKeyId}`;

      if (!appId.startsWith('vpaas-magic-cookie-') || !kid.startsWith(`${appId}/`)) {
        res.status(503).json({
          success: false,
          message: 'JaaS configuration is invalid. JAAS_APP_ID must be the AppID starting with vpaas-magic-cookie-, and JAAS_API_KEY_ID must be the key suffix or the full AppID/key-suffix value shown in the JaaS console.',
        });
        return;
      }

      const sessionId = String(req.params.id || '');
      const isPatient = authReq.user.userType === 'PATIENT';
      const staffRecordId = await resolveStaffRecordId(authReq);

      if (!isPatient && authReq.user.userType !== 'STAFF') {
        res.status(403).json({ success: false, message: 'Only the assigned patient or doctor can join this consultation.' });
        return;
      }
      if (authReq.user.userType === 'STAFF' && !staffRecordId) {
        res.status(403).json({ success: false, message: 'Your staff login is not linked to a staff profile.' });
        return;
      }

      const session = await telemedicineService.getSessionById(
        sessionId,
        String(authReq.user.hospitalId || ''),
        isPatient ? String(authReq.user._id) : undefined,
        isPatient ? undefined : staffRecordId,
      );

      if (!session) {
        res.status(404).json({ success: false, message: 'Telemedicine session not found or you are not assigned to it.' });
        return;
      }
      if ([ConsultationStatus.COMPLETED, ConsultationStatus.CANCELLED, ConsultationStatus.NO_SHOW].includes(session.status)) {
        res.status(409).json({ success: false, message: 'This consultation has ended and its meeting is no longer available.' });
        return;
      }

      const user = authReq.user as Record<string, unknown>;
      const firstName = typeof user.firstName === 'string' ? user.firstName : '';
      const lastName = typeof user.lastName === 'string' ? user.lastName : '';
      const suppliedName = typeof user.name === 'string' ? user.name : '';
      const displayName = (suppliedName || `${firstName} ${lastName}`.trim() ||
        (isPatient ? 'MedXVerse Patient' : 'MedXVerse Doctor')).slice(0, 100);
      const email = typeof user.email === 'string' ? user.email : undefined;
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = env.JAAS_TOKEN_TTL_SECONDS;
      const roomName = `${appId}/${session.meetingRoomId}`;

      const tokenPayload = {
        aud: 'jitsi',
        iss: 'chat',
        sub: appId,
        room: session.meetingRoomId,
        nbf: now - 10,
        exp: now + expiresIn,
        context: {
          user: {
            id: String(user._id),
            name: displayName,
            ...(email ? { email } : {}),
            moderator: !isPatient,
          },
          features: {
            livestreaming: false,
            recording: false,
            transcription: false,
            'outbound-call': false,
          },
        },
      };

      // Explicitly type the options so TypeScript selects jsonwebtoken's
      // options overload rather than treating this object as a callback.
      const signingOptions: SignOptions = {
        algorithm: 'RS256',
        header: {
          alg: 'RS256',
          kid,
          typ: 'JWT',
        },
      };

      const token = jwt.sign(tokenPayload, privateKey, signingOptions);

      res.status(200).json({
        success: true,
        data: {
          domain: '8x8.vc',
          appId,
          roomName,
          jwt: token,
          meetingUrl: `https://8x8.vc/${roomName}`,
          expiresAt: new Date((now + expiresIn) * 1000).toISOString(),
        },
      });
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