import {
  Request,
  Response,
  NextFunction,
} from 'express';

import { radiologyService } from './radiology.service.js';

import {
  ImagingModality,
  RadiologyOrderStatus,
  PriorityLevel,
  ExaminationQueueStatus,
  AssignmentRole,
  PregnancyScreeningStatus,
  ContrastStatus,
  CriticalResultStatus,
  AIStudyPriority,
} from './radiology.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hospitalId: string;
    [key: string]: unknown;
  };
}

export class RadiologyController {
  public async createOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const order =
        await radiologyService.createOrder({
          hospitalId: authReq.user.hospitalId,

          patientId: req.body.patientId,

          orderingDoctorId:
            req.body.orderingDoctorId ||
            authReq.user._id,

          modality:
            req.body.modality as ImagingModality,

          procedureName: req.body.procedureName,

          bodyPart: req.body.bodyPart,

          clinicalIndication:
            req.body.clinicalIndication,

          priority:
            req.body.priority as PriorityLevel,

          pricingCatalogueItemId:
            req.body.pricingCatalogueItemId,

          accessionNumber:
            req.body.accessionNumber,

          scheduling:
            req.body.scheduling,

          patientPreparation:
            req.body.patientPreparation,

          contrast: req.body.contrast,

          pregnancyScreening:
            req.body.pregnancyScreening,
        });

      res.status(201).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  public async getPricingCatalogues(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const catalogues = await radiologyService.getPricingCatalogues(
        authReq.user.hospitalId,
        typeof req.query.procedureName === 'string'
          ? req.query.procedureName
          : undefined
      );

      res.status(200).json({
        success: true,
        data: catalogues,
      });
    } catch (error) {
      next(error);
    }
  }

  public async getOrders(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const result =
        await radiologyService.getOrders(
          authReq.user.hospitalId,
          {
            page: req.query.page
              ? Number(req.query.page)
              : 1,

            limit: req.query.limit
              ? Number(req.query.limit)
              : 20,

            search:
              req.query.search as string | undefined,

            status:
              req.query.status as
                | RadiologyOrderStatus
                | undefined,

            modality:
              req.query.modality as
                | ImagingModality
                | undefined,

            priority:
              req.query.priority as
                | PriorityLevel
                | undefined,

            patientId:
              req.query.patientId as
                | string
                | undefined,

            orderingDoctorId:
              req.query.orderingDoctorId as
                | string
                | undefined,

            radiologistId:
              req.query.radiologistId as
                | string
                | undefined,

            queueStatus:
              req.query.queueStatus as
                | ExaminationQueueStatus
                | undefined,

            scheduledDate:
              req.query.scheduledDate as
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

  public async getOrderById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const order =
        await radiologyService.getOrderById(
          req.params.id,
          authReq.user.hospitalId
        );

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Radiology order not found',
        });

        return;
      }

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  public async updateOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated =
        await radiologyService.updateOrder(
          req.params.id,
          authReq.user.hospitalId,
          req.body
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message:
            'Radiology order not found or cannot be modified',
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

  public async scheduleOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated =
        await radiologyService.scheduleOrder(
          req.params.id,
          authReq.user.hospitalId,
          {
            ...req.body,
            scheduledBy: authReq.user._id,
          }
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Radiology order not found',
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

  public async assignStaff(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated =
        await radiologyService.assignStaff(
          req.params.id,
          authReq.user.hospitalId,
          {
            userId: req.body.userId,
            role: req.body.role as AssignmentRole,
            notes: req.body.notes,
          },
          authReq.user._id
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Radiology order not found',
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

  public async removeStaff(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated =
        await radiologyService.removeStaff(
          req.params.id,
          authReq.user.hospitalId,
          req.body.userId,
          req.body.role as AssignmentRole
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Radiology order not found',
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

  public async updateExaminationStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated =
        await radiologyService.updateExaminationStatus(
          req.params.id,
          authReq.user.hospitalId,
          {
            status:
              req.body.status as RadiologyOrderStatus,

            notes: req.body.notes,
          }
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Radiology order not found',
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

  public async updateQueue(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated =
        await radiologyService.updateQueue(
          req.params.id,
          authReq.user.hospitalId,
          {
            queuePosition:
              req.body.queuePosition,

            queueStatus:
              req.body.queueStatus as
                | ExaminationQueueStatus
                | undefined,
          }
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Radiology order not found',
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

  public async updatePacsData(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated =
        await radiologyService.updatePacsData(
          req.params.id,
          authReq.user.hospitalId,
          req.body
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Radiology order not found',
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

  public async updateContrast(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated =
        await radiologyService.updateContrast(
          req.params.id,
          authReq.user.hospitalId,
          {
            status:
              req.body.status as ContrastStatus,

            contrastName:
              req.body.contrastName,

            contrastType:
              req.body.contrastType,

            dose: req.body.dose,

            doseUnit:
              req.body.doseUnit,

            route:
              req.body.route,

            reactionObserved:
              req.body.reactionObserved,

            reactionDescription:
              req.body.reactionDescription,

            notes: req.body.notes,
          },
          authReq.user._id
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Radiology order not found',
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

  public async updatePregnancyScreening(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated =
        await radiologyService.updatePregnancyScreening(
          req.params.id,
          authReq.user.hospitalId,
          {
            status:
              req.body.status as PregnancyScreeningStatus,

            testType:
              req.body.testType,

            testResult:
              req.body.testResult,

            notes:
              req.body.notes,
          },
          authReq.user._id
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Radiology order not found',
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

  public async updateRadiationExposure(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated =
        await radiologyService.updateRadiationExposure(
          req.params.id,
          authReq.user.hospitalId,
          req.body,
          authReq.user._id
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Radiology order not found',
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

  public async completeReport(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated =
        await radiologyService.completeReport(
          req.params.id,
          authReq.user.hospitalId,
          {
            radiologistId:
              authReq.user._id,

            findings:
              req.body.findings,

            impression:
              req.body.impression,

            radiologistNotes:
              req.body.radiologistNotes,

            templateId:
              req.body.templateId,

            criticalResult:
              req.body.criticalResult,
          }
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Radiology order not found',
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

  public async signReport(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated =
        await radiologyService.signReport(
          req.params.id,
          authReq.user.hospitalId,
          {
            radiologistId:
              authReq.user._id,
          }
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message:
            'Radiology report not found',
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

  public async amendReport(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated =
        await radiologyService.amendReport(
          req.params.id,
          authReq.user.hospitalId,
          {
            radiologistId:
              authReq.user._id,

            findings:
              req.body.findings,

            impression:
              req.body.impression,

            radiologistNotes:
              req.body.radiologistNotes,

            amendmentReason:
              req.body.amendmentReason,
          }
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message:
            'Radiology report not found',
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

  public async updateCriticalResult(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated =
        await radiologyService.updateCriticalResult(
          req.params.id,
          authReq.user.hospitalId,
          {
            status:
              req.body.status as
                CriticalResultStatus,

            finding:
              req.body.finding,

            notifiedUserId:
              req.body.notifiedUserId,

            notificationMethod:
              req.body.notificationMethod,

            notificationNotes:
              req.body.notificationNotes,
          }
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Radiology order not found',
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

  public async updateAIAnalysis(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated =
        await radiologyService.updateAIAnalysis(
          req.params.id,
          authReq.user.hospitalId,
          {
            enabled:
              req.body.enabled,

            modelName:
              req.body.modelName,

            modelVersion:
              req.body.modelVersion,

            priority:
              req.body.priority as AIStudyPriority,

            confidence:
              req.body.confidence,

            findings:
              req.body.findings,

            measurements:
              req.body.measurements,

            recommendations:
              req.body.recommendations,

            qualityPassed:
              req.body.qualityPassed,

            qualityNotes:
              req.body.qualityNotes,
          }
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Radiology order not found',
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

      const order = await radiologyService.captureBilling(
        req.params.id,
        authReq.user.hospitalId,
        authReq.user._id
      );

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Radiology order not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  public async cancelOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;

      const updated =
        await radiologyService.cancelOrder(
          req.params.id,
          authReq.user.hospitalId,
          req.body.cancellationReason ||
            'No reason provided'
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message:
            'Radiology order not found or cannot be cancelled',
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

export const radiologyController =
  new RadiologyController();
