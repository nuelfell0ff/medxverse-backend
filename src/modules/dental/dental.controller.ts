import { Request, Response, NextFunction } from 'express';
import { dentalService } from './dental.service.js';
import {
  DentalProcedureType,
  ProcedureStatus,
} from './dental.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hospitalId: string;
    [key: string]: unknown;
  };
}

export class DentalController {
  public async upsertDentalChart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const dentistId = authReq.user._id;

      const { patientId, teeth, overallPeriodontalHealth, notes } = req.body;

      const chart = await dentalService.upsertDentalChart({
        hospitalId,
        patientId,
        dentistId,
        teeth,
        overallPeriodontalHealth,
        notes,
      });

      res.status(200).json({ success: true, data: chart });
    } catch (error) {
      next(error);
    }
  }

  public async getPatientDentalChart(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const patientId = req.params.patientId as string;

      const chart = await dentalService.getPatientDentalChart(patientId, hospitalId);

      if (!chart) {
        res.status(404).json({ success: false, message: 'Dental chart not found for patient' });
        return;
      }

      res.status(200).json({ success: true, data: chart });
    } catch (error) {
      next(error);
    }
  }

  public async createDentalProcedure(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const dentistId = authReq.user._id;

      const { patientId, procedureType, toothNumber, surfaces, status, cost, performedAt, clinicalNotes } =
        req.body;

      const procedure = await dentalService.createDentalProcedure({
        hospitalId,
        patientId,
        dentistId,
        procedureType: procedureType as DentalProcedureType,
        toothNumber,
        surfaces,
        status: status as ProcedureStatus,
        cost,
        performedAt,
        clinicalNotes,
      });

      res.status(201).json({ success: true, data: procedure });
    } catch (error) {
      next(error);
    }
  }

  public async getDentalProcedures(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const patientId = req.query.patientId as string | undefined;
      const dentistId = req.query.dentistId as string | undefined;
      const procedureType = req.query.procedureType as DentalProcedureType | undefined;
      const status = req.query.status as ProcedureStatus | undefined;
      const toothNumber = req.query.toothNumber
        ? parseInt(req.query.toothNumber as string, 10)
        : undefined;

      const result = await dentalService.getDentalProcedures(hospitalId, {
        page,
        limit,
        patientId,
        dentistId,
        procedureType,
        status,
        toothNumber,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async updateProcedureStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const { status, clinicalNotes, cost } = req.body;

      const updated = await dentalService.updateProcedureStatus(id, hospitalId, {
        status: status as ProcedureStatus,
        clinicalNotes,
        cost,
      });

      if (!updated) {
        res.status(404).json({ success: false, message: 'Dental procedure record not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}

export const dentalController = new DentalController();