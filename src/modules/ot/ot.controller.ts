import { Request, Response, NextFunction } from 'express';
import { otService } from './ot.service.js';
import {
  AnesthesiaType,
  SurgeryStatus,
  SurgeryUrgency,
} from './ot.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hospitalId: string;
    [key: string]: unknown;
  };
}

export class OTController {
  public async createCase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const createdById = authReq.user._id;

      const {
        patientId,
        otRoomNumber,
        urgency,
        procedure,
        surgicalTeam,
        anesthesiaType,
        preOpNotes,
        scheduledStartTime,
        scheduledEndTime,
      } = req.body;

      const surgicalCase = await otService.createCase({
        hospitalId,
        patientId,
        otRoomNumber,
        urgency: urgency as SurgeryUrgency,
        procedure,
        surgicalTeam,
        anesthesiaType: anesthesiaType as AnesthesiaType,
        preOpNotes,
        scheduledStartTime,
        scheduledEndTime,
        createdById,
      });

      res.status(201).json({ success: true, data: surgicalCase });
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
      const urgency = req.query.urgency as SurgeryUrgency | undefined;
      const otRoomNumber = req.query.otRoomNumber as string | undefined;
      const patientId = req.query.patientId as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const result = await otService.getCases(hospitalId, {
        page,
        limit,
        status,
        urgency,
        otRoomNumber,
        patientId,
        startDate,
        endDate,
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

      const surgicalCase = await otService.getCaseById(id, hospitalId);

      if (!surgicalCase) {
        res.status(404).json({ success: false, message: 'Surgical case not found' });
        return;
      }

      res.status(200).json({ success: true, data: surgicalCase });
    } catch (error) {
      next(error);
    }
  }

  public async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const { status, actualStartTime, actualEndTime } = req.body;

      const updated = await otService.updateStatus(id, hospitalId, {
        status: status as SurgeryStatus,
        actualStartTime: actualStartTime ? new Date(actualStartTime) : undefined,
        actualEndTime: actualEndTime ? new Date(actualEndTime) : undefined,
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

  public async updateSurgicalTeam(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const { surgicalTeam } = req.body;

      const updated = await otService.updateSurgicalTeam(id, hospitalId, {
        surgicalTeam,
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

  public async updatePostOpNotes(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const { postOpNotes } = req.body;

      const updated = await otService.updatePostOpNotes(id, hospitalId, {
        postOpNotes,
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
}

export const otController = new OTController();