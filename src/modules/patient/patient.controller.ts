import { Request, Response, NextFunction } from 'express';
import { PatientService } from './patient.service.js';
import { CreatePatientDTO, AddVitalsDTO, GetPatientsQueryDTO } from './patient.types.js';

interface AuthenticatedRequest<Params = Record<string, string>, ResBody = any, ReqBody = any, ReqQuery = any>
  extends Request<Params, ResBody, ReqBody, ReqQuery> {
  user?: {
    id?: string;
    accountId?: string;
    hospitalId?: string;
    _id?: string;
  };
}

export class PatientController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest<{}, any, CreatePatientDTO>;
      const user = authReq.user;

      // Ensure hospitalId is resolved correctly from JWT payload (accountId/id/_id/hospitalId)
      const hospitalId = user?.hospitalId || user?.accountId || user?.id || user?._id;

      if (!hospitalId) {
        res.status(400).json({
          success: false,
          message: 'Hospital ID not found in authentication context.',
        });
        return;
      }

      const patient = await PatientService.registerPatient(hospitalId, authReq.body);

      res.status(201).json({
        success: true,
        data: patient,
      });
    } catch (error: unknown) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest<{}, any, any, GetPatientsQueryDTO>;
      const user = authReq.user;
      const hospitalId = user?.hospitalId || user?.accountId || user?.id || user?._id;

      if (!hospitalId) {
        res.status(400).json({
          success: false,
          message: 'Hospital ID not found in authentication context.',
        });
        return;
      }

      const result = await PatientService.getPatients(hospitalId, authReq.query);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error: unknown) {
      next(error);
    }
  }

  static async getById(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as unknown as AuthenticatedRequest<{ id: string }>;
      const user = authReq.user;
      const hospitalId = user?.hospitalId || user?.accountId || user?.id || user?._id;
      const patientId = req.params.id;

      if (!hospitalId) {
        res.status(400).json({
          success: false,
          message: 'Hospital ID not found in authentication context.',
        });
        return;
      }

      const patient = await PatientService.getPatientById(hospitalId, patientId);

      res.status(200).json({
        success: true,
        data: patient,
      });
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
      const user = authReq.user;
      const hospitalId = user?.hospitalId || user?.accountId || user?.id || user?._id;
      const userId = user?.id || user?.accountId || user?._id;
      const patientId = req.params.id;

      if (!hospitalId || !userId) {
        res.status(400).json({
          success: false,
          message: 'User authentication context is incomplete.',
        });
        return;
      }

      const patient = await PatientService.addVitals(hospitalId, patientId, userId, authReq.body);

      res.status(200).json({
        success: true,
        data: patient,
      });
    } catch (error: unknown) {
      next(error);
    }
  }
}
