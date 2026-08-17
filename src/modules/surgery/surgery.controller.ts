import { Request, Response, NextFunction } from 'express';
import { surgeryService } from './surgery.service.js';
import {
  SurgeryStatus,
  UrgencyLevel,
  PriorityLevel,
  AnesthesiaType,
  SurgicalRole,
} from './surgery.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hospitalId: string;
    [key: string]: unknown;
  };
}

export class SurgeryController {
  public async scheduleCase(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const {
        patientId,
        leadSurgeonId,
        theatreId,
        procedureName,
        icdCode,
        urgency,
        priority,
        scheduledStartTime,
        scheduledEndTime,
        estimatedDurationMinutes,
        anesthesiaType,
        surgicalTeam,
      } = req.body;

      const surgeryCase = await surgeryService.scheduleCase({
        hospitalId: authReq.user.hospitalId,
        patientId,
        leadSurgeonId: leadSurgeonId || authReq.user._id,
        theatreId,
        procedureName,
        icdCode,
        urgency: urgency as UrgencyLevel,
        priority: priority as PriorityLevel,
        scheduledStartTime: new Date(scheduledStartTime),
        scheduledEndTime: new Date(scheduledEndTime),
        estimatedDurationMinutes,
        anesthesiaType: anesthesiaType as AnesthesiaType,
        surgicalTeam,
      });

      res.status(201).json({
        success: true,
        data: surgeryCase,
      });
    } catch (error) {
      next(error);
    }
  }

  public async getCases(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const result = await surgeryService.getCases(
        authReq.user.hospitalId,
        {
          page: req.query.page
            ? parseInt(req.query.page as string, 10)
            : 1,
          limit: req.query.limit
            ? parseInt(req.query.limit as string, 10)
            : 20,
          status: req.query.status as SurgeryStatus | undefined,
          urgency: req.query.urgency as UrgencyLevel | undefined,
          priority: req.query.priority as PriorityLevel | undefined,
          theatreId: req.query.theatreId as string | undefined,
          leadSurgeonId:
            req.query.leadSurgeonId as string | undefined,
          patientId: req.query.patientId as string | undefined,
          date: req.query.date as string | undefined,
        }
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async getCaseById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const surgeryCase = await surgeryService.getCaseById(
        req.params.id,
        authReq.user.hospitalId
      );

      if (!surgeryCase) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: surgeryCase,
      });
    } catch (error) {
      next(error);
    }
  }

  public async rescheduleCase(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated = await surgeryService.rescheduleCase(
        req.params.id,
        authReq.user.hospitalId,
        new Date(req.body.scheduledStartTime),
        new Date(req.body.scheduledEndTime)
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  public async updatePreOp(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated = await surgeryService.updatePreOpAssessment(
        req.params.id,
        authReq.user.hospitalId,
        req.body
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found',
        });
        return;
      }

      if (req.body.clearedForSurgery === true) {
        if (updated.preOpAssessment) {
          updated.preOpAssessment.clearedBy = authReq.user._id as never;
        }
      }

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  public async updateConsent(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated = await surgeryService.updateConsent(
        req.params.id,
        authReq.user.hospitalId,
        req.body
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  public async updateWHOChecklist(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated = await surgeryService.updateWHOChecklist(
        req.params.id,
        authReq.user.hospitalId,
        {
          stage: req.body.stage,
          data: req.body.data,
        },
        authReq.user._id
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  public async addVitalsLog(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated = await surgeryService.addVitalsLog(
        req.params.id,
        authReq.user.hospitalId,
        req.body
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found or surgery is not in progress',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  public async updateAnesthesia(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated = await surgeryService.updateAnesthesia(
        req.params.id,
        authReq.user.hospitalId,
        req.body
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  public async updateIntraopDocs(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated = await surgeryService.updateIntraopDocs(
        req.params.id,
        authReq.user.hospitalId,
        req.body
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  public async startSurgery(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated = await surgeryService.startSurgery(
        req.params.id,
        authReq.user.hospitalId
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  public async completeSurgery(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated = await surgeryService.completeSurgery(
        req.params.id,
        authReq.user.hospitalId,
        req.body
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found or not currently in progress',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  public async cancelCase(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated = await surgeryService.cancelCase(
        req.params.id,
        authReq.user.hospitalId,
        req.body.cancellationReason || 'No reason specified'
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found or cannot be cancelled',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  public async postponeCase(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated = await surgeryService.postponeCase(
        req.params.id,
        authReq.user.hospitalId,
        req.body.postponementReason || 'No reason specified'
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found or cannot be postponed',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  public async assignTeamMember(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated = await surgeryService.assignTeamMember(
        req.params.id,
        authReq.user.hospitalId,
        req.body.userId,
        req.body.role as SurgicalRole,
        req.body.credentialVerified ?? false
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  public async getTheatreSchedule(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const cases = await surgeryService.getTheatreSchedule(
        authReq.user.hospitalId,
        req.params.theatreId,
        req.query.date as string
      );

      res.status(200).json({
        success: true,
        data: cases,
      });
    } catch (error) {
      next(error);
    }
  }

  public async getUtilization(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const result = await surgeryService.getUtilization(
        authReq.user.hospitalId,
        req.params.theatreId,
        new Date(req.query.startDate as string),
        new Date(req.query.endDate as string)
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const surgeryController = new SurgeryController();
