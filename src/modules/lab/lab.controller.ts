import { Request, Response, NextFunction } from 'express';
import { LabService } from './lab.service.js';
import {
  CreateLabOrderDTO,
  RecordLabResultsDTO,
  RejectSampleDTO,
  GetLabOrdersQueryDTO,
} from './lab.types.js';

interface AuthenticatedRequest<Params = Record<string, string>, ResBody = any, ReqBody = any, ReqQuery = any>
  extends Request<Params, ResBody, ReqBody, ReqQuery> {
  user?: {
    id: string;
    hospitalId?: string;
  };
}

export class LabController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest<{}, any, CreateLabOrderDTO>;
      const user = authReq.user!;
      const hospitalId = user.hospitalId || user.id;

      const order = await LabService.createOrder(hospitalId, user.id, authReq.body);
      res.status(201).json({ success: true, data: order });
    } catch (error: unknown) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest<{}, any, any, GetLabOrdersQueryDTO>;
      const user = authReq.user!;
      const hospitalId = user.hospitalId || user.id;

      const result = await LabService.getOrders(hospitalId, authReq.query);
      res.status(200).json({ success: true, ...result });
    } catch (error: unknown) {
      next(error);
    }
  }

  static async getById(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as unknown as AuthenticatedRequest<{ id: string }>;
      const user = authReq.user!;
      const hospitalId = user.hospitalId || user.id;

      const order = await LabService.getOrderById(hospitalId, req.params.id);
      res.status(200).json({ success: true, data: order });
    } catch (error: unknown) {
      next(error);
    }
  }

  static async collectSample(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as unknown as AuthenticatedRequest<{ id: string }>;
      const user = authReq.user!;
      const hospitalId = user.hospitalId || user.id;

      const updated = await LabService.collectSample(hospitalId, req.params.id, user.id);
      res.status(200).json({ success: true, data: updated });
    } catch (error: unknown) {
      next(error);
    }
  }

  static async accessionSpecimen(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as unknown as AuthenticatedRequest<{ id: string }, any, { location: string }>;
      const user = authReq.user!;
      const hospitalId = user.hospitalId || user.id;

      const updated = await LabService.accessionSpecimen(
        hospitalId,
        req.params.id,
        user.id,
        authReq.body.location || 'Central Processing'
      );
      res.status(200).json({ success: true, data: updated });
    } catch (error: unknown) {
      next(error);
    }
  }

  static async rejectSample(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as unknown as AuthenticatedRequest<{ id: string }, any, RejectSampleDTO>;
      const user = authReq.user!;
      const hospitalId = user.hospitalId || user.id;

      const updated = await LabService.rejectSample(hospitalId, req.params.id, user.id, authReq.body);
      res.status(200).json({ success: true, data: updated });
    } catch (error: unknown) {
      next(error);
    }
  }

  static async submitResults(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as unknown as AuthenticatedRequest<{ id: string }, any, RecordLabResultsDTO>;
      const user = authReq.user!;
      const hospitalId = user.hospitalId || user.id;

      const updated = await LabService.recordResults(hospitalId, req.params.id, user.id, authReq.body);
      res.status(200).json({ success: true, data: updated });
    } catch (error: unknown) {
      next(error);
    }
  }

  static async verifyResults(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as unknown as AuthenticatedRequest<{ id: string }>;
      const user = authReq.user!;
      const hospitalId = user.hospitalId || user.id;

      const updated = await LabService.verifyResults(hospitalId, req.params.id, user.id);
      res.status(200).json({ success: true, data: updated });
    } catch (error: unknown) {
      next(error);
    }
  }
}