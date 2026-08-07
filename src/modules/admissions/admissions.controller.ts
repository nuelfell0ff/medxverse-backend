import { Request, Response, NextFunction } from 'express';
import { admissionsService } from './admissions.service.js';
import { AdmissionStatus, BedType } from './admissions.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hospitalId: string;
    [key: string]: unknown;
  };
}

export class AdmissionsController {
  public async admitPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const { patientId, admittingDoctorId, wardId, bedNumber, bedType, admissionReason } = req.body;

      const admission = await admissionsService.admitPatient({
        hospitalId,
        patientId,
        admittingDoctorId: admittingDoctorId || authReq.user._id,
        wardId,
        bedNumber,
        bedType: bedType as BedType,
        admissionReason,
      });

      res.status(201).json({ success: true, data: admission });
    } catch (error) {
      next(error);
    }
  }

  public async getAdmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const status = req.query.status as AdmissionStatus | undefined;
      const wardId = req.query.wardId as string | undefined;
      const patientId = req.query.patientId as string | undefined;

      const result = await admissionsService.getAdmissions(hospitalId, {
        page,
        limit,
        status,
        wardId,
        patientId,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async getAdmissionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const admission = await admissionsService.getAdmissionById(id, hospitalId);

      if (!admission) {
        res.status(404).json({ success: false, message: 'Admission record not found' });
        return;
      }

      res.status(200).json({ success: true, data: admission });
    } catch (error) {
      next(error);
    }
  }

  public async transferBed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const transferredBy = authReq.user._id;
      const id = req.params.id as string;

      const { toWardId, toBedNumber, reason } = req.body;

      const updated = await admissionsService.transferBed(id, hospitalId, {
        toWardId,
        toBedNumber,
        transferredBy,
        reason,
      });

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async dischargePatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const { dischargeSummary } = req.body;

      const updated = await admissionsService.dischargePatient(id, hospitalId, {
        dischargeSummary,
      });

      if (!updated) {
        res.status(404).json({ success: false, message: 'Active admission record not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}

export const admissionsController = new AdmissionsController();