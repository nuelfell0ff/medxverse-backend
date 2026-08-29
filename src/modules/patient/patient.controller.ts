import { Request, Response, NextFunction } from 'express';
import { PatientService } from './patient.service.js';
import {
  CreatePatientDTO,
  AddVitalsDTO,
  GetPatientsQueryDTO,
} from './patient.types.js';

interface AuthenticatedRequest<
  Params = Record<string, string>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> extends Request<Params, ResBody, ReqBody, ReqQuery> {
  user?: {
    id?: string;
    accountId?: string;
    hospitalId?: string;
    _id?: string;
  };
}

const getHospitalId = (user?: AuthenticatedRequest['user']): string | undefined =>
  user?.hospitalId || user?.accountId || user?.id || user?._id;

const getUserId = (user?: AuthenticatedRequest['user']): string | undefined =>
  user?.id || user?._id || user?.accountId;

export class PatientController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest<Record<string, string>, any, CreatePatientDTO>;
      const hospitalId = getHospitalId(authReq.user);

      if (!hospitalId) {
        res.status(400).json({ success: false, message: 'Hospital ID not found in authentication context.' });
        return;
      }

      const patient = await PatientService.registerPatient(hospitalId, authReq.body);

      res.status(201).json({ success: true, data: patient });
    } catch (error: unknown) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest<Record<string, string>, any, any, GetPatientsQueryDTO>;
      const hospitalId = getHospitalId(authReq.user);

      if (!hospitalId) {
        res.status(400).json({ success: false, message: 'Hospital ID not found in authentication context.' });
        return;
      }

      const result = await PatientService.getPatients(hospitalId, authReq.query);
      res.status(200).json({ success: true, ...result });
    } catch (error: unknown) {
      next(error);
    }
  }

  static async getById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as unknown as AuthenticatedRequest<{ id: string }>;
      const hospitalId = getHospitalId(authReq.user);

      if (!hospitalId) {
        res.status(400).json({ success: false, message: 'Hospital ID not found in authentication context.' });
        return;
      }

      const patient = await PatientService.getPatientById(hospitalId, req.params.id);
      res.status(200).json({ success: true, data: patient });
    } catch (error: unknown) {
      next(error);
    }
  }

  static async getClinicalSummary(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as unknown as AuthenticatedRequest<{ id: string }>;
      const hospitalId = getHospitalId(authReq.user);

      if (!hospitalId) {
        res.status(400).json({ success: false, message: 'Hospital ID not found in authentication context.' });
        return;
      }

      const data = await PatientService.getPatientClinicalSummary(hospitalId, req.params.id);
      res.status(200).json({ success: true, data });
    } catch (error: unknown) {
      next(error);
    }
  }

  static async recordVitals(
    req: Request<{ id: string }, any, AddVitalsDTO>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as unknown as AuthenticatedRequest<{ id: string }, any, AddVitalsDTO>;
      const hospitalId = getHospitalId(authReq.user);
      const userId = getUserId(authReq.user);

      if (!hospitalId || !userId) {
        res.status(400).json({ success: false, message: 'User authentication context is incomplete.' });
        return;
      }

      const patient = await PatientService.addVitals(
        hospitalId,
        req.params.id,
        userId,
        authReq.body
      );

      res.status(200).json({ success: true, data: patient });
    } catch (error: unknown) {
      next(error);
    }
  }
}
