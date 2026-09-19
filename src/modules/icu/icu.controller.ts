import { Request, Response, NextFunction } from 'express';
import { icuService } from './icu.service.js';
import {
  CareLevel,
  DeviceProtocol,
  ICUCaseStatus,
  ICUDeviceType,
  ReadingQuality,
  VentilatorMode,
  FlowEntrySource,
} from './icu.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hospitalId: string;
    [key: string]: unknown;
  };
}

const auth = (req: Request) => (req as AuthenticatedRequest).user;

export class ICUController {
  public async createAdmission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = auth(req);
      const admission = await icuService.createAdmission(user.hospitalId, {
        patientId: req.body.patientId,
        wardId: req.body.wardId,
        bedNumber: req.body.bedNumber,
        careLevel: req.body.careLevel as CareLevel,
        primaryDiagnosis: req.body.primaryDiagnosis,
        admissionReason: req.body.admissionReason,
        attendingPhysicianId: req.body.attendingPhysicianId,
        admittedById: user._id,
        vitals: req.body.vitals,
        ventilatorSettings: req.body.ventilatorSettings
          ? { ...req.body.ventilatorSettings, mode: req.body.ventilatorSettings.mode as VentilatorMode }
          : undefined,
        sourceSurgeryCaseId: req.body.sourceSurgeryCaseId,
        encounterId: req.body.encounterId,
      });

      res.status(201).json({ success: true, data: admission });
    } catch (error) {
      next(error);
    }
  }

  public async getAdmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = auth(req);
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await icuService.getAdmissions(user.hospitalId, {
        page,
        limit,
        status: req.query.status as ICUCaseStatus | undefined,
        careLevel: req.query.careLevel as CareLevel | undefined,
        patientId: req.query.patientId as string | undefined,
        bedNumber: req.query.bedNumber as string | undefined,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async getAdmissionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = auth(req);
      const admission = await icuService.getAdmissionById(req.params.id, user.hospitalId);

      if (!admission) {
        res.status(404).json({ success: false, message: 'ICU admission record not found.' });
        return;
      }

      res.status(200).json({ success: true, data: admission });
    } catch (error) {
      next(error);
    }
  }

  public async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = auth(req);
      const dashboard = await icuService.getDashboard(user.hospitalId, req.params.id);
      res.status(200).json({ success: true, data: dashboard });
    } catch (error) {
      next(error);
    }
  }

  public async updateVitals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = auth(req);
      const updated = await icuService.updateVitals(
        req.params.id,
        user.hospitalId,
        user._id,
        { vitals: req.body.vitals },
      );

      if (!updated) {
        res.status(404).json({ success: false, message: 'ICU admission record not found.' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async updateVentilatorSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = auth(req);
      const updated = await icuService.updateVentilatorSettings(
        req.params.id,
        user.hospitalId,
        user._id,
        {
          ventilatorSettings: {
            ...req.body.ventilatorSettings,
            mode: req.body.ventilatorSettings?.mode as VentilatorMode,
          },
        },
      );

      if (!updated) {
        res.status(404).json({ success: false, message: 'ICU admission record not found.' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = auth(req);
      const updated = await icuService.updateStatus(
        req.params.id,
        user.hospitalId,
        user._id,
        {
          status: req.body.status as ICUCaseStatus,
          dispositionNotes: req.body.dispositionNotes,
          transferredToWardId: req.body.transferredToWardId,
          dischargedAt: req.body.dischargedAt ? new Date(req.body.dischargedAt) : undefined,
        },
      );

      if (!updated) {
        res.status(404).json({ success: false, message: 'ICU admission record not found.' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async ingestDeviceReading(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = auth(req);
      const reading = await icuService.ingestDeviceReading(user.hospitalId, user._id, {
        ...req.body,
        deviceType: req.body.deviceType as ICUDeviceType,
        protocol: req.body.protocol as DeviceProtocol | undefined,
        quality: req.body.quality as ReadingQuality | undefined,
      });

      res.status(201).json({ success: true, data: reading });
    } catch (error) {
      next(error);
    }
  }

  public async getDeviceReadings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = auth(req);
      const readings = await icuService.getDeviceReadings(user.hospitalId, req.params.id, {
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
        deviceId: req.query.deviceId as string | undefined,
        parameter: req.query.parameter as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 1000,
      });

      res.status(200).json({ success: true, data: readings });
    } catch (error) {
      next(error);
    }
  }

  public async getTrends(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = auth(req);
      const points = await icuService.getTrends(user.hospitalId, req.params.id, {
        parameter: req.query.parameter as string,
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
        deviceId: req.query.deviceId as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 5000,
      });
      res.status(200).json({ success: true, data: points });
    } catch (error) {
      next(error);
    }
  }

  public async getFlowsheet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = auth(req);
      const entries = await icuService.getFlowsheet(user.hospitalId, req.params.id, {
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
        parameter: req.query.parameter as string | undefined,
        status: req.query.status as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 1000,
      });

      res.status(200).json({ success: true, data: entries });
    } catch (error) {
      next(error);
    }
  }

  public async addFlowsheetEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = auth(req);
      const entry = await icuService.addFlowsheetEntry(user.hospitalId, user._id, {
        admissionId: req.params.id,
        recordedAt: req.body.recordedAt,
        category: req.body.category,
        parameter: req.body.parameter,
        value: req.body.value,
        unit: req.body.unit,
        source: req.body.source as FlowEntrySource | undefined,
        sourceDeviceReadingId: req.body.sourceDeviceReadingId,
        annotation: req.body.annotation,
      });

      res.status(201).json({ success: true, data: entry });
    } catch (error) {
      next(error);
    }
  }

  public async confirmFlowsheetEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = auth(req);
      const entry = await icuService.confirmFlowsheetEntry(
        user.hospitalId,
        user._id,
        req.params.entryId,
        req.body.annotation,
      );

      if (!entry) {
        res.status(404).json({ success: false, message: 'Flowsheet entry not found.' });
        return;
      }

      res.status(200).json({ success: true, data: entry });
    } catch (error) {
      next(error);
    }
  }

  public async recalculateScores(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = auth(req);
      const scores = await icuService.recalculateScores(user.hospitalId, user._id, {
        admissionId: req.params.id,
        calculatedAt: req.body.calculatedAt,
        windowStart: req.body.windowStart,
        windowEnd: req.body.windowEnd,
        labs: req.body.labs,
        clinical: req.body.clinical,
      });

      res.status(201).json({ success: true, data: scores });
    } catch (error) {
      next(error);
    }
  }

  public async recalculateScoresFromData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = auth(req);
      const scores = await icuService.recalculateScoresFromUnderlyingData(
        user.hospitalId,
        user._id,
        req.params.id,
      );
      res.status(201).json({ success: true, data: scores });
    } catch (error) {
      next(error);
    }
  }

  public async getScores(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = auth(req);
      const scores = await icuService.getScores(
        user.hospitalId,
        req.params.id,
        req.query.scoreType as string | undefined,
      );

      res.status(200).json({ success: true, data: scores });
    } catch (error) {
      next(error);
    }
  }

  public async addFamilyCommunication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = auth(req);
      const log = await icuService.addFamilyCommunication(user.hospitalId, user._id, {
        admissionId: req.params.id,
        contactName: req.body.contactName,
        relationship: req.body.relationship,
        contactMethod: req.body.contactMethod,
        topics: req.body.topics || [],
        summary: req.body.summary,
        questionsOrConcerns: req.body.questionsOrConcerns,
        followUpRequired: req.body.followUpRequired,
        followUpPlan: req.body.followUpPlan,
      });

      res.status(201).json({ success: true, data: log });
    } catch (error) {
      next(error);
    }
  }

  public async getFamilyCommunications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = auth(req);
      const logs = await icuService.getFamilyCommunications(user.hospitalId, req.params.id);
      res.status(200).json({ success: true, data: logs });
    } catch (error) {
      next(error);
    }
  }
}

export const icuController = new ICUController();
