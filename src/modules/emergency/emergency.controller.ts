import { Request, Response, NextFunction } from 'express';
import { emergencyService } from './emergency.service.js';
import {
  TriageCategory,
  EmergencyStatus,
  ArrivalMode,
  TraumaType,
} from './emergency.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hospitalId: string;
    [key: string]: unknown;
  };
}

export class EmergencyController {
  public async createCase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const triagedById = authReq.user._id;

      const {
        patientId,
        isUnidentified,
        temporaryIdentifier,
        chiefComplaint,
        arrivalMode,
        triageCategory,
        triageVitals,
        assignedBay,
        traumaType,
        attendingDoctorId,
      } = req.body;

      const emergencyCase = await emergencyService.createCase({
        hospitalId,
        patientId,
        isUnidentified: Boolean(isUnidentified),
        temporaryIdentifier,
        chiefComplaint,
        arrivalMode: arrivalMode as ArrivalMode,
        triageCategory: triageCategory as TriageCategory,
        triageVitals,
        assignedBay,
        traumaType: (traumaType as TraumaType) || TraumaType.NONE,
        attendingDoctorId,
        triagedById,
      });

      res.status(201).json({ success: true, data: emergencyCase });
    } catch (error) {
      next(error);
    }
  }

  public async getCases(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const status = req.query.status as EmergencyStatus | undefined;
      const triageCategory = req.query.triageCategory as TriageCategory | undefined;
      const traumaType = req.query.traumaType as TraumaType | undefined;
      const patientId = req.query.patientId as string | undefined;
      const isUnidentified =
        req.query.isUnidentified !== undefined
          ? req.query.isUnidentified === 'true'
          : undefined;

      const result = await emergencyService.getCases(hospitalId, {
        page,
        limit,
        status,
        triageCategory,
        traumaType,
        patientId,
        isUnidentified,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async getCaseById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const emergencyCase = await emergencyService.getCaseById(id, hospitalId);

      if (!emergencyCase) {
        res.status(404).json({ success: false, message: 'Emergency case not found' });
        return;
      }

      res.status(200).json({ success: true, data: emergencyCase });
    } catch (error) {
      next(error);
    }
  }

  public async updateTriage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const { triageCategory, triageVitals, assignedBay, attendingDoctorId } = req.body;

      const updated = await emergencyService.updateTriage(id, hospitalId, {
        triageCategory: triageCategory as TriageCategory,
        triageVitals,
        assignedBay,
        attendingDoctorId,
      });

      if (!updated) {
        res.status(404).json({ success: false, message: 'Emergency case not found' });
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

      const { status, dispositionNotes, admittedToWardId, transferredToFacility } = req.body;

      const updated = await emergencyService.updateStatus(id, hospitalId, {
        status: status as EmergencyStatus,
        dispositionNotes,
        admittedToWardId,
        transferredToFacility,
      });

      if (!updated) {
        res.status(404).json({ success: false, message: 'Emergency case not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}

export const emergencyController = new EmergencyController();