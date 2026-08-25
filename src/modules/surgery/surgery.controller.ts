import { Request, Response, NextFunction } from 'express';
import { surgeryService } from './surgery.service.js';
import {
  SurgeryStatus,
  UrgencyLevel,
  AnesthesiaType,
} from './surgery.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hospitalId: string;
    [key: string]: unknown;
  };
}

export class SurgeryController {
  private parseTeamMembers(rawTeam: unknown) {
    if (!Array.isArray(rawTeam)) return [];

    return rawTeam
      .filter((member) => member && typeof member === 'object')
      .map((member: any) => ({
        userId: member.userId,
        role: member.role,
        credentialVerified: Boolean(member.credentialVerified),
        notes: member.notes || '',
      }));
  }

  public async scheduleCase(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const leadSurgeonId = req.body.leadSurgeonId;
      if (!leadSurgeonId) {
        res.status(400).json({
          success: false,
          message: 'leadSurgeonId is required.',
        });
        return;
      }

      const surgeryCase = await surgeryService.scheduleCase(
        authReq.user.hospitalId,
        authReq.user._id,
        {
          patientId: req.body.patientId,
          leadSurgeonId,
          theatreId: req.body.theatreId,
          procedureName: req.body.procedureName,
          icdCode: req.body.icdCode,
          urgency: req.body.urgency as UrgencyLevel,
          priority: req.body.priority,
          scheduledStartTime: new Date(req.body.scheduledStartTime),
          scheduledEndTime: new Date(req.body.scheduledEndTime),
          anesthesiaType: req.body.anesthesiaType as AnesthesiaType,
          surgicalTeam: this.parseTeamMembers(req.body.surgicalTeam),
          estimatedDurationMinutes: req.body.estimatedDurationMinutes,
        }
      );

      res.status(201).json({
        success: true,
        data: surgeryCase,
      });
    } catch (error) {
      next(error);
    }
  }

  public async scheduleEmergencyCase(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const leadSurgeonId = req.body.leadSurgeonId;
      if (!leadSurgeonId) {
        res.status(400).json({
          success: false,
          message: 'leadSurgeonId is required for emergency surgery.',
        });
        return;
      }

      const surgeryCase = await surgeryService.insertEmergencyCase(
        authReq.user.hospitalId,
        authReq.user._id,
        {
          patientId: req.body.patientId,
          leadSurgeonId,
          theatreId: req.body.theatreId,
          procedureName: req.body.procedureName,
          icdCode: req.body.icdCode,
          urgency: UrgencyLevel.EMERGENCY,
          priority: req.body.priority ?? 100,
          scheduledStartTime: new Date(req.body.scheduledStartTime),
          scheduledEndTime: new Date(req.body.scheduledEndTime),
          anesthesiaType: req.body.anesthesiaType as AnesthesiaType,
          surgicalTeam: this.parseTeamMembers(req.body.surgicalTeam),
          estimatedDurationMinutes: req.body.estimatedDurationMinutes,
        }
      );

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
          page: req.query.page ? Number(req.query.page) : 1,
          limit: req.query.limit ? Number(req.query.limit) : 20,
          status: req.query.status as SurgeryStatus | undefined,
          urgency: req.query.urgency as UrgencyLevel | undefined,
          theatreId: req.query.theatreId as string | undefined,
          leadSurgeonId: req.query.leadSurgeonId as string | undefined,
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
          message: 'Surgical case not found.',
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
        authReq.user._id,
        req.body
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found.',
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
        authReq.user._id,
        req.body
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found.',
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

  public async updateTeam(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated = await surgeryService.updateTeam(
        req.params.id,
        authReq.user.hospitalId,
        authReq.user._id,
        req.body
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found.',
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
        authReq.user._id,
        {
          scheduledStartTime: new Date(req.body.scheduledStartTime),
          scheduledEndTime: new Date(req.body.scheduledEndTime),
          theatreId: req.body.theatreId,
          reason: req.body.reason,
        }
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found.',
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

  public async addMedication(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated = await surgeryService.updateMedication(
        req.params.id,
        authReq.user.hospitalId,
        authReq.user._id,
        req.body
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found.',
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

  public async administerMedication(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated = await surgeryService.administerMedication(
        req.params.id,
        authReq.user.hospitalId,
        authReq.user._id,
        req.body
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Medication or surgical case not found.',
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
        authReq.user._id,
        req.body
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found.',
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
        authReq.user._id,
        req.body
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found.',
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
        authReq.user.hospitalId,
        authReq.user._id
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found or cannot be started.',
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
        authReq.user._id,
        req.body
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found or surgery is not in progress.',
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
        authReq.user._id,
        req.body
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found.',
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
        authReq.user._id,
        req.body
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found or surgery is not in progress.',
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

  public async captureBilling(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated = await surgeryService.captureBilling(
        req.params.id,
        authReq.user.hospitalId,
        authReq.user._id,
        {
          force: Boolean(req.body?.force),
        }
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Surgery billing capture completed.',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  public async updateRecovery(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated = await surgeryService.updateRecovery(
        req.params.id,
        authReq.user.hospitalId,
        authReq.user._id,
        req.body
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found or not currently in recovery.',
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
        authReq.user._id,
        req.body.cancellationReason || 'No reason specified.'
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found.',
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
        authReq.user._id,
        req.body.reason || 'No reason specified.'
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Surgical case not found.',
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
}

export const surgeryController = new SurgeryController();