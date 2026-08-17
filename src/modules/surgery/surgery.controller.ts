import {
  Request,
  Response,
  NextFunction,
} from 'express';

import { surgeryService } from './surgery.service.js';

import {
  AnesthesiaType,
  SurgeryPriority,
  SurgeryStatus,
  UrgencyLevel,
} from './surgery.types.js';

export interface AuthenticatedRequest
  extends Request {
  user: {
    _id: string;
    hospitalId: string;
    [key: string]: unknown;
  };
}

export class SurgeryController {
  /**
   * ============================================================
   * SCHEDULE
   * ============================================================
   */

  public async scheduleCase(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq =
        req as AuthenticatedRequest;

      const hospitalId =
        authReq.user.hospitalId;

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

      const surgeryCase =
        await surgeryService.scheduleCase({
          hospitalId,

          patientId,

          leadSurgeonId:
            leadSurgeonId ||
            authReq.user._id,

          theatreId,

          procedureName,

          icdCode,

          urgency:
            urgency as UrgencyLevel,

          priority:
            priority as SurgeryPriority,

          scheduledStartTime:
            new Date(
              scheduledStartTime
            ),

          scheduledEndTime:
            new Date(
              scheduledEndTime
            ),

          estimatedDurationMinutes,

          anesthesiaType:
            anesthesiaType as AnesthesiaType,

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

  /**
   * ============================================================
   * GET CASES
   * ============================================================
   */

  public async getCases(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq =
        req as AuthenticatedRequest;

      const hospitalId =
        authReq.user.hospitalId;

      const page = req.query.page
        ? parseInt(
            req.query.page as string,
            10
          )
        : 1;

      const limit = req.query.limit
        ? parseInt(
            req.query.limit as string,
            10
          )
        : 20;

      const result =
        await surgeryService.getCases(
          hospitalId,
          {
            page,

            limit,

            status:
              req.query.status as
                | SurgeryStatus
                | undefined,

            urgency:
              req.query.urgency as
                | UrgencyLevel
                | undefined,

            priority:
              req.query.priority as
                | SurgeryPriority
                | undefined,

            theatreId:
              req.query.theatreId as
                | string
                | undefined,

            leadSurgeonId:
              req.query.leadSurgeonId as
                | string
                | undefined,

            patientId:
              req.query.patientId as
                | string
                | undefined,

            date:
              req.query.date as
                | string
                | undefined,

            fromDate:
              req.query.fromDate as
                | string
                | undefined,

            toDate:
              req.query.toDate as
                | string
                | undefined,
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

  /**
   * ============================================================
   * GET SINGLE CASE
   * ============================================================
   */

  public async getCaseById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq =
        req as AuthenticatedRequest;

      const hospitalId =
        authReq.user.hospitalId;

      const id =
        req.params.id as string;

      const surgeryCase =
        await surgeryService.getCaseById(
          id,
          hospitalId
        );

      if (!surgeryCase) {
        res.status(404).json({
          success: false,
          message:
            'Surgical case not found.',
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

  /**
   * ============================================================
   * PRE-OP
   * ============================================================
   */

  public async updatePreOp(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq =
        req as AuthenticatedRequest;

      const hospitalId =
        authReq.user.hospitalId;

      const id =
        req.params.id as string;

      const updated =
        await surgeryService.updatePreOpAssessment(
          id,
          hospitalId,
          req.body
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message:
            'Surgical case not found.',
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

  /**
   * ============================================================
   * CONSENT
   * ============================================================
   */

  public async updateConsent(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq =
        req as AuthenticatedRequest;

      const hospitalId =
        authReq.user.hospitalId;

      const id =
        req.params.id as string;

      const updated =
        await surgeryService.updateConsent(
          id,
          hospitalId,
          req.body,
          authReq.user._id
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message:
            'Surgical case not found.',
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

  /**
   * ============================================================
   * WHO CHECKLIST
   * ============================================================
   */

  public async updateWHOChecklist(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq =
        req as AuthenticatedRequest;

      const hospitalId =
        authReq.user.hospitalId;

      const id =
        req.params.id as string;

      const {
        stage,
        data,
      } = req.body;

      const updated =
        await surgeryService.updateWHOChecklist(
          id,
          hospitalId,
          {
            stage,
            completedBy:
              authReq.user._id,
            data,
          }
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message:
            'Surgical case not found.',
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

  /**
   * ============================================================
   * VITALS
   * ============================================================
   */

  public async addVitalsLog(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq =
        req as AuthenticatedRequest;

      const hospitalId =
        authReq.user.hospitalId;

      const id =
        req.params.id as string;

      const updated =
        await surgeryService.addVitalsLog(
          id,
          hospitalId,
          req.body
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message:
            'Surgical case not found.',
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

  /**
   * ============================================================
   * START
   * ============================================================
   */

  public async startSurgery(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq =
        req as AuthenticatedRequest;

      const hospitalId =
        authReq.user.hospitalId;

      const id =
        req.params.id as string;

      const updated =
        await surgeryService.startSurgery(
          id,
          hospitalId
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message:
            'Surgical case not found.',
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

  /**
   * ============================================================
   * INTRAOPERATIVE DOCUMENTATION
   * ============================================================
   */

  public async updateIntraopDocs(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq =
        req as AuthenticatedRequest;

      const hospitalId =
        authReq.user.hospitalId;

      const id =
        req.params.id as string;

      const updated =
        await surgeryService.updateIntraopDocs(
          id,
          hospitalId,
          req.body
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message:
            'Surgical case not found.',
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

  /**
   * ============================================================
   * ANAESTHESIA
   * ============================================================
   */

  public async updateAnesthesia(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq =
        req as AuthenticatedRequest;

      const hospitalId =
        authReq.user.hospitalId;

      const id =
        req.params.id as string;

      const updated =
        await surgeryService.updateAnesthesiaRecord(
          id,
          hospitalId,
          req.body
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message:
            'Surgical case not found.',
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

  /**
   * ============================================================
   * MEDICATION
   * ============================================================
   */

  public async addMedication(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq =
        req as AuthenticatedRequest;

      const hospitalId =
        authReq.user.hospitalId;

      const id =
        req.params.id as string;

      const updated =
        await surgeryService.addMedication(
          id,
          hospitalId,
          req.body,
          authReq.user._id
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message:
            'Surgical case not found.',
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

  /**
   * ============================================================
   * RECOVERY
   * ============================================================
   */

  public async updateRecovery(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq =
        req as AuthenticatedRequest;

      const hospitalId =
        authReq.user.hospitalId;

      const id =
        req.params.id as string;

      const updated =
        await surgeryService.updateRecovery(
          id,
          hospitalId,
          req.body
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message:
            'Surgical case not found.',
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

  /**
   * ============================================================
   * COMPLETE
   * ============================================================
   */

  public async completeSurgery(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq =
        req as AuthenticatedRequest;

      const hospitalId =
        authReq.user.hospitalId;

      const id =
        req.params.id as string;

      const updated =
        await surgeryService.completeSurgery(
          id,
          hospitalId,
          req.body
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message:
            'Surgical case not found or not currently in progress.',
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

  /**
   * ============================================================
   * CANCEL
   * ============================================================
   */

  public async cancelCase(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq =
        req as AuthenticatedRequest;

      const hospitalId =
        authReq.user.hospitalId;

      const id =
        req.params.id as string;

      const {
        cancellationReason,
      } = req.body;

      const updated =
        await surgeryService.cancelCase(
          id,
          hospitalId,
          cancellationReason
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message:
            'Surgical case not found.',
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

  /**
   * ============================================================
   * RESCHEDULE
   * ============================================================
   */

  public async rescheduleCase(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq =
        req as AuthenticatedRequest;

      const hospitalId =
        authReq.user.hospitalId;

      const id =
        req.params.id as string;

      const updated =
        await surgeryService.rescheduleCase(
          id,
          hospitalId,
          {
            scheduledStartTime:
              new Date(
                req.body.scheduledStartTime
              ),

            scheduledEndTime:
              new Date(
                req.body.scheduledEndTime
              ),

            reason:
              req.body.reason,
          },
          authReq.user._id
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message:
            'Surgical case not found.',
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

  /**
   * ============================================================
   * POSTPONE
   * ============================================================
   */

  public async postponeCase(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq =
        req as AuthenticatedRequest;

      const hospitalId =
        authReq.user.hospitalId;

      const id =
        req.params.id as string;

      const updated =
        await surgeryService.postponeCase(
          id,
          hospitalId,
          req.body.reason
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message:
            'Surgical case not found.',
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

export const surgeryController =
  new SurgeryController();
