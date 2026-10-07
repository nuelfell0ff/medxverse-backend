import { Request, Response, NextFunction } from 'express';
import { PatientAssignmentService } from './patient-assignment.service.js';

interface AuthRequest extends Request {
  user?: {
    _id?: string;
    hospitalId?: string;
    accountId?: string;
    userType?: 'STAFF' | 'ACCOUNT';
    role?: string;
  };
}

function auth(req: Request) {
  const user = (req as AuthRequest).user;
  const hospitalId = user?.hospitalId || user?.accountId;
  const userId = user?._id;

  if (!hospitalId || !userId) {
    throw Object.assign(new Error('Authenticated hospital context is missing.'), { statusCode: 401 });
  }

  return {
    userId: String(userId),
    hospitalId: String(hospitalId),
    userType: user?.userType === 'STAFF' ? 'STAFF' as const : 'ACCOUNT' as const,
  };
}

export class PatientAssignmentController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const context = auth(req);
      const data = await PatientAssignmentService.createAssignment(
        context.hospitalId,
        context.userId,
        context.userType,
        req.body,
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async listMine(req: Request, res: Response, next: NextFunction) {
    try {
      const context = auth(req);
      const staffId = await PatientAssignmentService.resolveStaffId(
        context.userId,
        context.hospitalId,
      );
      const data = await PatientAssignmentService.listMyPatients(
        context.hospitalId,
        String(staffId),
        req.query,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async listPatientAssignments(req: Request<{ patientId: string }>, res: Response, next: NextFunction) {
    try {
      const context = auth(req);
      const data = await PatientAssignmentService.listPatientAssignments(
        context.hospitalId,
        req.params.patientId,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getMyPatient(req: Request<{ patientId: string }>, res: Response, next: NextFunction) {
    try {
      const context = auth(req);
      const staffId = await PatientAssignmentService.resolveStaffId(
        context.userId,
        context.hospitalId,
      );
      const data = await PatientAssignmentService.getMyPatient(
        context.hospitalId,
        String(staffId),
        req.params.patientId,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const context = auth(req);
      const data = await PatientAssignmentService.getAssignmentById(
        context.hospitalId,
        req.params.id,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async syncAppointments(req: Request, res: Response, next: NextFunction) {
    try {
      const context = auth(req);
      const data = await PatientAssignmentService.syncAppointmentAssignments(context.hospitalId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const context = auth(req);
      const data = await PatientAssignmentService.endAssignment(
        context.hospitalId,
        req.params.id,
        req.body,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
