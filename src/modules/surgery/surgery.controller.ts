import { Request, Response, NextFunction } from 'express';
import { surgeryService } from './surgery.service.js';

const asNonEmptyString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} is required.`);
  }
  return value.trim();
};

const asDate = (value: unknown, field: string): Date => {
  if (typeof value !== 'string' && !(value instanceof Date)) {
    throw new Error(`${field} is required.`);
  }
  const date = new Date(value as string | Date);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid ${field}.`);
  return date;
};

const asFiniteNumber = (value: unknown, field: string, min?: number, max?: number): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`Invalid ${field}.`);
  if (min !== undefined && n < min) throw new Error(`${field} is below the allowed minimum.`);
  if (max !== undefined && n > max) throw new Error(`${field} exceeds the allowed maximum.`);
  return n;
};

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
          patientId: asNonEmptyString(req.body.patientId, 'patientId'),
          leadSurgeonId: asNonEmptyString(leadSurgeonId, 'leadSurgeonId'),
          theatreId: asNonEmptyString(req.body.theatreId, 'theatreId'),
          procedureName: asNonEmptyString(req.body.procedureName, 'procedureName'),
          icdCode: typeof req.body.icdCode === 'string' ? req.body.icdCode.trim() : undefined,
          urgency: req.body.urgency as UrgencyLevel,
          priority: asFiniteNumber(req.body.priority, 'priority', 0, 1000),
          scheduledStartTime: asDate(req.body.scheduledStartTime, 'scheduledStartTime'),
          scheduledEndTime: asDate(req.body.scheduledEndTime, 'scheduledEndTime'),
          anesthesiaType: req.body.anesthesiaType as AnesthesiaType,
          surgicalTeam: this.parseTeamMembers(req.body.surgicalTeam),
          estimatedDurationMinutes: asFiniteNumber(req.body.estimatedDurationMinutes, 'estimatedDurationMinutes', 1, 1440),
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
          patientId: asNonEmptyString(req.body.patientId, 'patientId'),
          leadSurgeonId: asNonEmptyString(leadSurgeonId, 'leadSurgeonId'),
          theatreId: asNonEmptyString(req.body.theatreId, 'theatreId'),
          procedureName: asNonEmptyString(req.body.procedureName, 'procedureName'),
          icdCode: typeof req.body.icdCode === 'string' ? req.body.icdCode.trim() : undefined,
          urgency: UrgencyLevel.EMERGENCY,
          priority: asFiniteNumber(req.body.priority ?? 100, 'priority', 0, 1000),
          scheduledStartTime: asDate(req.body.scheduledStartTime, 'scheduledStartTime'),
          scheduledEndTime: asDate(req.body.scheduledEndTime, 'scheduledEndTime'),
          anesthesiaType: req.body.anesthesiaType as AnesthesiaType,
          surgicalTeam: this.parseTeamMembers(req.body.surgicalTeam),
          estimatedDurationMinutes: asFiniteNumber(req.body.estimatedDurationMinutes, 'estimatedDurationMinutes', 1, 1440),
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

      req.body.bpSystolic = asFiniteNumber(req.body.bpSystolic, 'bpSystolic', 0, 400);
      req.body.bpDiastolic = asFiniteNumber(req.body.bpDiastolic, 'bpDiastolic', 0, 250);
      req.body.heartRate = asFiniteNumber(req.body.heartRate, 'heartRate', 0, 300);
      req.body.spO2 = asFiniteNumber(req.body.spO2, 'spO2', 0, 100);
      req.body.respRate = asFiniteNumber(req.body.respRate, 'respRate', 0, 100);
      req.body.tempCelsius = asFiniteNumber(req.body.tempCelsius, 'tempCelsius', 20, 45);

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
        asNonEmptyString(req.body.cancellationReason || '', 'cancellationReason')
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
        asNonEmptyString(req.body.reason || '', 'reason')
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