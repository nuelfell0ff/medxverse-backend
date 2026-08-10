import { Request, Response, NextFunction } from 'express';
import { outpatientService } from './outpatient.service.js';
import { ConsultationStatus, TriagePriority } from './outpatient.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hospitalId: string;
    [key: string]: unknown;
  };
}

export class OutpatientController {
  public async createEncounter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const { patientId, doctorId, departmentId, triagePriority, chiefComplaint } = req.body;

      const encounter = await outpatientService.createEncounter({
        hospitalId,
        patientId,
        doctorId,
        departmentId,
        triagePriority: triagePriority as TriagePriority,
        chiefComplaint,
      });

      res.status(201).json({ success: true, data: encounter });
    } catch (error) {
      next(error);
    }
  }

  public async getQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const status = req.query.status as ConsultationStatus | undefined;
      const doctorId = req.query.doctorId as string | undefined;
      const triagePriority = req.query.triagePriority as TriagePriority | undefined;

      const result = await outpatientService.getQueue(hospitalId, {
        page,
        limit,
        status,
        doctorId,
        triagePriority,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async getEncounterById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const encounterId = req.params.id as string;

      const encounter = await outpatientService.getEncounterById(encounterId, hospitalId);

      if (!encounter) {
        res.status(404).json({ success: false, message: 'Encounter not found' });
        return;
      }

      res.status(200).json({ success: true, data: encounter });
    } catch (error) {
      next(error);
    }
  }

  public async recordVitals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const encounterId = req.params.id as string;

      const { vitalSigns, nursingNotes } = req.body;

      const updated = await outpatientService.recordVitals(encounterId, hospitalId, {
        vitalSigns,
        nursingNotes,
      });

      if (!updated) {
        res.status(404).json({ success: false, message: 'Encounter not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async startConsultation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const doctorId = authReq.user._id;
      const encounterId = req.params.id as string;

      const updated = await outpatientService.startConsultation(encounterId, hospitalId, doctorId);

      if (!updated) {
        res.status(404).json({ success: false, message: 'Encounter not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async completeConsultation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const encounterId = req.params.id as string;

      const { consultationNotes, diagnoses } = req.body;

      const updated = await outpatientService.completeConsultation(encounterId, hospitalId, {
        consultationNotes,
        diagnoses,
      });

      if (!updated) {
        res.status(404).json({ success: false, message: 'Encounter not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}

export const outpatientController = new OutpatientController();
