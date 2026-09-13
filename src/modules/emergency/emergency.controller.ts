import { Request, Response, NextFunction } from 'express';
import { emergencyService } from './emergency.service.js';
import {
  AcuityLevel,
  ArrivalMode,
  DispositionType,
  EDOrderStatus,
  EDOrderType,
  EDVisitStatus,
  TriageScale,
  TraumaType,
} from './emergency.types.js';

export interface AuthenticatedRequest extends Request {
  user: { _id: string; hospitalId: string; [key: string]: unknown };
}

export class EmergencyController {
  private auth(req: Request) { return (req as AuthenticatedRequest).user; }

  public async createVisit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.auth(req);
      const visit = await emergencyService.createVisit({
        ...req.body,
        hospitalId: user.hospitalId,
        actorId: user._id,
        arrivalMode: req.body.arrivalMode as ArrivalMode,
        traumaType: req.body.traumaType as TraumaType | undefined,
      });
      res.status(201).json({ success: true, data: visit });
    } catch (error) { next(error); }
  }

  public async getBoard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.auth(req);
      const data = await emergencyService.getBoard(user.hospitalId, {
        status: req.query.status as EDVisitStatus | undefined,
        acuityLevel: req.query.acuityLevel ? Number(req.query.acuityLevel) as AcuityLevel : undefined,
        zone: req.query.zone as string | undefined,
        page: Number(req.query.page || 1),
        limit: Number(req.query.limit || 50),
      });
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  public async getVisits(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.auth(req);
      const data = await emergencyService.getVisits(user.hospitalId, {
        status: req.query.status as EDVisitStatus | undefined,
        acuityLevel: req.query.acuityLevel ? Number(req.query.acuityLevel) as AcuityLevel : undefined,
        patientId: req.query.patientId as string | undefined,
        visitNumber: req.query.visitNumber as string | undefined,
        page: Number(req.query.page || 1),
        limit: Number(req.query.limit || 20),
      });
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  public async getVisit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await emergencyService.getVisitById(req.params.id as string, this.auth(req).hospitalId);
      if (!data) { res.status(404).json({ success: false, message: 'ED visit not found' }); return; }
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  public async triage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.auth(req);

      if (!user?._id) {
        res.status(401).json({ success: false, message: 'Authenticated user ID is missing.' });
        return;
      }

      if (!user?.hospitalId) {
        res.status(400).json({ success: false, message: 'Hospital context is missing.' });
        return;
      }

      const body = req.body ?? {};
      const scale = typeof body.scale === 'string' ? body.scale.trim().toUpperCase() : '';
      const acuityLevel = Number(body.acuityLevel);

      const errors: string[] = [];

      if (!Object.values(TriageScale).includes(scale as TriageScale)) {
        errors.push('scale must be ESI or CTAS');
      }

      if (!Number.isInteger(acuityLevel) || acuityLevel < 1 || acuityLevel > 5) {
        errors.push('acuityLevel must be an integer between 1 and 5');
      }

      if (body.chiefComplaint !== undefined && body.chiefComplaint !== null && typeof body.chiefComplaint !== 'string') {
        errors.push('chiefComplaint must be a string');
      }

      if (body.vitals !== undefined && (typeof body.vitals !== 'object' || Array.isArray(body.vitals))) {
        errors.push('vitals must be an object');
      }

      if (errors.length) {
        res.status(400).json({
          success: false,
          message: 'Invalid triage request.',
          errors,
        });
        return;
      }

      const data = await emergencyService.createTriage(
        req.params.id as string,
        user.hospitalId,
        user._id,
        {
          scale: scale as TriageScale,
          acuityLevel: acuityLevel as AcuityLevel,
          chiefComplaint: typeof body.chiefComplaint === 'string' ? body.chiefComplaint : undefined,
          vitals: body.vitals,
          resourceNeeds: body.resourceNeeds,
          notes: typeof body.notes === 'string' ? body.notes : undefined,
        },
      );

      res.status(201).json({ success: true, data });
    } catch (error) {
      if (error instanceof Error && (
        error.message.startsWith('Triage validation failed:') ||
        error.message.startsWith('Invalid ObjectId:')
      )) {
        res.status(400).json({
          success: false,
          message: error.message,
          errors: [error.message],
        });
        return;
      }

      next(error);
    }
  }

  public async getBays(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await emergencyService.getBays(this.auth(req).hospitalId) }); }
    catch (error) { next(error); }
  }

  public async createBay(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.auth(req);
      const data = await emergencyService.createBay(user.hospitalId, user._id, req.body);
      res.status(201).json({ success: true, data });
    } catch (error) { next(error); }
  }

  public async assignBay(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.auth(req);
      const data = await emergencyService.assignBay(req.params.id as string, user.hospitalId, user._id, {
        bayId: req.body.bayId,
        bayCode: req.body.bayCode,
        reason: req.body.reason,
      });
      res.status(201).json({ success: true, data });
    } catch (error) { next(error); }
  }

  public async releaseBay(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.auth(req);
      const data = await emergencyService.releaseBay(req.params.id as string, user.hospitalId, user._id, req.body.reason);
      if (!data) { res.status(404).json({ success: false, message: 'Active bay assignment not found' }); return; }
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  public async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.auth(req);
      const data = await emergencyService.createOrder(req.params.id as string, user.hospitalId, user._id, {
        type: req.body.type as EDOrderType,
        name: req.body.name,
        sourceSystem: req.body.sourceSystem,
        sourceRecordId: req.body.sourceRecordId,
        notes: req.body.notes,
      });
      res.status(201).json({ success: true, data });
    } catch (error) { next(error); }
  }

  public async updateOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.auth(req);
      const data = await emergencyService.updateOrder(req.params.orderId as string, user.hospitalId, user._id, {
        status: req.body.status as EDOrderStatus,
        resultSummary: req.body.resultSummary,
        notes: req.body.notes,
      });
      if (!data) { res.status(404).json({ success: false, message: 'ED order not found' }); return; }
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  public async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.auth(req);
      const data = await emergencyService.updateStatus(req.params.id as string, user.hospitalId, user._id, {
        status: req.body.status as EDVisitStatus,
        reason: req.body.reason,
      });
      if (!data) { res.status(404).json({ success: false, message: 'ED visit not found' }); return; }
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  public async disposition(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.auth(req);
      const data = await emergencyService.recordDisposition(req.params.id as string, user.hospitalId, user._id, {
        disposition: req.body.disposition as DispositionType,
        notes: req.body.notes,
        wardId: req.body.wardId,
        transferFacility: req.body.transferFacility,
      });
      res.status(201).json({ success: true, data });
    } catch (error) { next(error); }
  }

  public async statusHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await emergencyService.getStatusHistory(req.params.id as string, this.auth(req).hospitalId) }); }
    catch (error) { next(error); }
  }
}

export const emergencyController = new EmergencyController();
