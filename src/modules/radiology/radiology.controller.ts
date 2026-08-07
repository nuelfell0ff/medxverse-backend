import { Request, Response, NextFunction } from 'express';
import { radiologyService } from './radiology.service.js';
import {
  ImagingModality,
  RadiologyOrderStatus,
  PriorityLevel,
} from './radiology.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hospitalId: string;
    [key: string]: unknown;
  };
}

export class RadiologyController {
  public async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const {
        patientId,
        orderingDoctorId,
        modality,
        procedureName,
        bodyPart,
        clinicalIndication,
        priority,
      } = req.body;

      const order = await radiologyService.createOrder({
        hospitalId,
        patientId,
        orderingDoctorId: orderingDoctorId || authReq.user._id,
        modality: modality as ImagingModality,
        procedureName,
        bodyPart,
        clinicalIndication,
        priority: priority as PriorityLevel,
      });

      res.status(201).json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }

  public async getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const status = req.query.status as RadiologyOrderStatus | undefined;
      const modality = req.query.modality as ImagingModality | undefined;
      const patientId = req.query.patientId as string | undefined;
      const orderingDoctorId = req.query.orderingDoctorId as string | undefined;
      const radiologistId = req.query.radiologistId as string | undefined;

      const result = await radiologyService.getOrders(hospitalId, {
        page,
        limit,
        status,
        modality,
        patientId,
        orderingDoctorId,
        radiologistId,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async getOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const order = await radiologyService.getOrderById(id, hospitalId);

      if (!order) {
        res.status(404).json({ success: false, message: 'Radiology order not found' });
        return;
      }

      res.status(200).json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }

  public async updatePacsData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const { studyInstanceUid, seriesInstanceUid, imageCount, dicomViewerUrl, dicomFileKeys } = req.body;

      const updated = await radiologyService.updatePacsData(id, hospitalId, {
        studyInstanceUid,
        seriesInstanceUid,
        imageCount,
        dicomViewerUrl,
        dicomFileKeys,
      });

      if (!updated) {
        res.status(404).json({ success: false, message: 'Radiology order not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async completeReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const radiologistId = authReq.user._id;
      const id = req.params.id as string;

      const { findings, impression, radiologistNotes } = req.body;

      const updated = await radiologyService.completeReport(id, hospitalId, {
        radiologistId,
        findings,
        impression,
        radiologistNotes,
      });

      if (!updated) {
        res.status(404).json({ success: false, message: 'Radiology order not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async cancelOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const { cancellationReason } = req.body;

      const updated = await radiologyService.cancelOrder(
        id,
        hospitalId,
        cancellationReason || 'No reason provided'
      );

      if (!updated) {
        res.status(404).json({ success: false, message: 'Radiology order not found or already reported' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}

export const radiologyController = new RadiologyController();