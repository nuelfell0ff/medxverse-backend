import { Request, Response, NextFunction } from 'express';
import { surgeryService } from './surgery.service.js';
import { SurgeryStatus, AnesthesiaType, UrgencyLevel } from './surgery.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hospitalId: string;
    [key: string]: unknown;
  };
}

export class SurgeryController {
  public async scheduleCase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const {
        patientId,
        leadSurgeonId,
        theatreId,
        procedureName,
        icdCode,
        urgency,
        scheduledStartTime,
        scheduledEndTime,
        anesthesiaType,
        surgicalTeam,
      } = req.body;

      const surgeryCase = await surgeryService.scheduleCase({
        hospitalId,
        patientId,
        leadSurgeonId: leadSurgeonId || authReq.user._id,
        theatreId,
        procedureName,
        icdCode,
        urgency: urgency as UrgencyLevel,
        scheduledStartTime: new Date(scheduledStartTime),
        scheduledEndTime: new Date(scheduledEndTime),
        anesthesiaType: anesthesiaType as AnesthesiaType,
        surgicalTeam,
      });

      res.status(201).json({ success: true, data: surgeryCase });
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
      const status = req.query.status as SurgeryStatus | undefined;
      const theatreId = req.query.theatreId as string | undefined;
      const leadSurgeonId = req.query.leadSurgeonId as string | undefined;
      const patientId = req.query.patientId as string | undefined;
      const date = req.query.date as string | undefined;

      const result = await surgeryService.getCases(hospitalId, {
        page,
        limit,
        status,
        theatreId,
        leadSurgeonId,
        patientId,
        date,
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

      const surgeryCase = await surgeryService.getCaseById(id, hospitalId);

      if (!surgeryCase) {
        res.status(404).json({ success: false, message: 'Surgical case not found' });
        return;
      }

      res.status(200).json({ success: true, data: surgeryCase });
    } catch (error) {
      next(error);
    }
  }

  public async updateChecklist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const { signInCompleted, timeOutCompleted, signOutCompleted, notes } = req.body;

      const updated = await surgeryService.updateChecklist(id, hospitalId, {
        signInCompleted,
        timeOutCompleted,
        signOutCompleted,
        notes,
      });

      if (!updated) {
        res.status(404).json({ success: false, message: 'Surgical case not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async startSurgery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const updated = await surgeryService.startSurgery(id, hospitalId);

      if (!updated) {
        res.status(404).json({ success: false, message: 'Surgical case not found or not in scheduled state' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async completeSurgery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const { anesthesiaNotes, operationNotes, postOpNotes } = req.body;

      const updated = await surgeryService.completeSurgery(id, hospitalId, {
        anesthesiaNotes,
        operationNotes,
        postOpNotes,
      });

      if (!updated) {
        res.status(404).json({ success: false, message: 'Surgical case not found or not currently in progress' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async cancelCase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const { cancellationReason } = req.body;

      const updated = await surgeryService.cancelCase(id, hospitalId, cancellationReason || 'No reason specified');

      if (!updated) {
        res.status(404).json({ success: false, message: 'Surgical case not found or already completed' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}

export const surgeryController = new SurgeryController();