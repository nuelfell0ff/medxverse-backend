import { Request, Response, NextFunction } from 'express';
import { icuService } from './icu.service.js';
import { CareLevel, ICUCaseStatus } from './icu.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hospitalId: string;
    [key: string]: unknown;
  };
}

export class ICUController {
  public async createAdmission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const admittedById = authReq.user._id;

      const {
        patientId,
        bedNumber,
        careLevel,
        primaryDiagnosis,
        attendingPhysicianId,
        vitals,
        ventilatorSettings,
      } = req.body;

      const admission = await icuService.createAdmission({
        hospitalId,
        patientId,
        bedNumber,
        careLevel: careLevel as CareLevel,
        primaryDiagnosis,
        attendingPhysicianId,
        admittedById,
        vitals,
        ventilatorSettings,
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
      const status = req.query.status as ICUCaseStatus | undefined;
      const careLevel = req.query.careLevel as CareLevel | undefined;
      const patientId = req.query.patientId as string | undefined;
      const bedNumber = req.query.bedNumber as string | undefined;

      const result = await icuService.getAdmissions(hospitalId, {
        page,
        limit,
        status,
        careLevel,
        patientId,
        bedNumber,
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

      const admission = await icuService.getAdmissionById(id, hospitalId);

      if (!admission) {
        res.status(404).json({ success: false, message: 'ICU admission record not found' });
        return;
      }

      res.status(200).json({ success: true, data: admission });
    } catch (error) {
      next(error);
    }
  }

  public async updateVitals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;
      const { vitals } = req.body;

      const updated = await icuService.updateVitals(id, hospitalId, { vitals });

      if (!updated) {
        res.status(404).json({ success: false, message: 'ICU admission record not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async updateVentilatorSettings(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;
      const { ventilatorSettings } = req.body;

      const updated = await icuService.updateVentilatorSettings(id, hospitalId, {
        ventilatorSettings,
      });

      if (!updated) {
        res.status(404).json({ success: false, message: 'ICU admission record not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const { status, dispositionNotes, transferredToWardId, dischargedAt } = req.body;

      const updated = await icuService.updateStatus(id, hospitalId, {
        status: status as ICUCaseStatus,
        dispositionNotes,
        transferredToWardId,
        dischargedAt: dischargedAt ? new Date(dischargedAt) : undefined,
      });

      if (!updated) {
        res.status(404).json({ success: false, message: 'ICU admission record not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}

export const icuController = new ICUController();