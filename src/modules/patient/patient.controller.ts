import { Request, Response, NextFunction } from 'express';
import { PatientService } from './patient.service.js';
import {
  CreatePatientDTO,
  AddVitalsDTO,
  GetPatientsQueryDTO,
  UpdatePatientDTO,
  CreateEncounterDTO,
  CreateEHRResourceDTO,
  CreateConsentDTO,
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
    role?: string;
  };
}

const getHospitalId = (user?: AuthenticatedRequest['user']): string | undefined =>
  user?.hospitalId || user?.accountId || user?.id || user?._id;

const getUserId = (user?: AuthenticatedRequest['user']): string | undefined =>
  user?.id || user?._id || user?.accountId;

const actor = (req: AuthenticatedRequest) => {
  const userId = getUserId(req.user);
  if (!userId) throw Object.assign(new Error('User authentication context is incomplete.'), { statusCode: 400 });
  return { userId, role: req.user?.role };
};

export class PatientController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest<Record<string, string>, any, CreatePatientDTO>;
      const hospitalId = getHospitalId(authReq.user);
      if (!hospitalId) {
        res.status(400).json({ success: false, message: 'Hospital ID not found in authentication context.' });
        return;
      }
      const patient = await PatientService.registerPatient(hospitalId, authReq.body, actor(authReq));
      res.status(201).json({ success: true, data: patient });
    } catch (error: unknown) { next(error); }
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
    } catch (error: unknown) { next(error); }
  }

  static async getById(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as unknown as AuthenticatedRequest<{ id: string }>;
      const hospitalId = getHospitalId(authReq.user);
      if (!hospitalId) {
        res.status(400).json({ success: false, message: 'Hospital ID not found in authentication context.' });
        return;
      }
      const patient = await PatientService.getPatientById(hospitalId, req.params.id);
      res.status(200).json({ success: true, data: patient });
    } catch (error: unknown) { next(error); }
  }

  static async update(req: Request<{ id: string }, any, UpdatePatientDTO>, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as unknown as AuthenticatedRequest<{ id: string }, any, UpdatePatientDTO>;
      const hospitalId = getHospitalId(authReq.user);
      if (!hospitalId) {
        res.status(400).json({ success: false, message: 'Hospital ID not found in authentication context.' });
        return;
      }
      const patient = await PatientService.updatePatient(hospitalId, req.params.id, actor(authReq), authReq.body);
      res.status(200).json({ success: true, data: patient });
    } catch (error: unknown) { next(error); }
  }

  static async getClinicalSummary(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as unknown as AuthenticatedRequest<{ id: string }>;
      const hospitalId = getHospitalId(authReq.user);
      if (!hospitalId) {
        res.status(400).json({ success: false, message: 'Hospital ID not found in authentication context.' });
        return;
      }
      const data = await PatientService.getClinicalSummary(hospitalId, req.params.id, actor(authReq));
      res.status(200).json({ success: true, data });
    } catch (error: unknown) { next(error); }
  }

  static async getEHR(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as unknown as AuthenticatedRequest<{ id: string }, any, any, { includeSensitive?: string }>;
      const hospitalId = getHospitalId(authReq.user);
      if (!hospitalId) {
        res.status(400).json({ success: false, message: 'Hospital ID not found in authentication context.' });
        return;
      }
      const includeSensitive = authReq.query.includeSensitive !== 'false';
      const data = await PatientService.getEHRChart(hospitalId, req.params.id, actor(authReq), { includeSensitive });
      res.status(200).json({ success: true, data });
    } catch (error: unknown) { next(error); }
  }

  static async recordVitals(req: Request<{ id: string }, any, AddVitalsDTO>, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as unknown as AuthenticatedRequest<{ id: string }, any, AddVitalsDTO>;
      const hospitalId = getHospitalId(authReq.user);
      const userId = getUserId(authReq.user);
      if (!hospitalId || !userId) {
        res.status(400).json({ success: false, message: 'User authentication context is incomplete.' });
        return;
      }
      const patient = await PatientService.addVitals(hospitalId, req.params.id, userId, authReq.body);
      res.status(200).json({ success: true, data: patient });
    } catch (error: unknown) { next(error); }
  }

  static async createEncounter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as unknown as AuthenticatedRequest<any, any, CreateEncounterDTO>;
      const hospitalId = getHospitalId(authReq.user);
      if (!hospitalId) throw Object.assign(new Error('Hospital ID not found in authentication context.'), { statusCode: 400 });
      const data = await PatientService.createEncounter(hospitalId, actor(authReq), authReq.body);
      res.status(201).json({ success: true, data });
    } catch (error: unknown) { next(error); }
  }

  static async createResource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as unknown as AuthenticatedRequest<any, any, CreateEHRResourceDTO>;
      const hospitalId = getHospitalId(authReq.user);
      if (!hospitalId) throw Object.assign(new Error('Hospital ID not found in authentication context.'), { statusCode: 400 });
      const data = await PatientService.createEHRResource(hospitalId, actor(authReq), authReq.body);
      res.status(201).json({ success: true, data });
    } catch (error: unknown) { next(error); }
  }

  static async updateResource(req: Request<{ resourceType: string; resourceId: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as unknown as AuthenticatedRequest<{ resourceType: string; resourceId: string }, any, { resource: Record<string, unknown>; reason?: string; sensitive?: boolean; sensitivityCode?: string }>;
      const hospitalId = getHospitalId(authReq.user);
      if (!hospitalId) throw Object.assign(new Error('Hospital ID not found in authentication context.'), { statusCode: 400 });
      const data = await PatientService.updateEHRResource(
        hospitalId,
        actor(authReq),
        authReq.params.resourceType as any,
        authReq.params.resourceId,
        authReq.body
      );
      res.status(200).json({ success: true, data });
    } catch (error: unknown) { next(error); }
  }

  static async versions(req: Request<{ id: string; resourceType: string; resourceId: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as unknown as AuthenticatedRequest<{ id: string; resourceType: string; resourceId: string }>;
      const hospitalId = getHospitalId(authReq.user);
      if (!hospitalId) throw Object.assign(new Error('Hospital ID not found in authentication context.'), { statusCode: 400 });
      const data = await PatientService.getResourceVersions(
        hospitalId,
        req.params.id,
        req.params.resourceType as any,
        req.params.resourceId,
        actor(authReq)
      );
      res.status(200).json({ success: true, data });
    } catch (error: unknown) { next(error); }
  }

  static async duplicates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as unknown as AuthenticatedRequest<any, any, any>;
      const hospitalId = getHospitalId(authReq.user);
      if (!hospitalId) throw Object.assign(new Error('Hospital ID not found in authentication context.'), { statusCode: 400 });
      const data = await PatientService.findDuplicatePatients(hospitalId, authReq.body || req.query as any);
      res.status(200).json({ success: true, data });
    } catch (error: unknown) { next(error); }
  }

  static async merge(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as unknown as AuthenticatedRequest<{ id: string }, any, { targetPatientId: string; reason: string }>;
      const hospitalId = getHospitalId(authReq.user);
      if (!hospitalId) throw Object.assign(new Error('Hospital ID not found in authentication context.'), { statusCode: 400 });
      const data = await PatientService.mergePatients(
        hospitalId,
        actor(authReq),
        req.params.id,
        authReq.body.targetPatientId,
        authReq.body.reason
      );
      res.status(200).json({ success: true, data });
    } catch (error: unknown) { next(error); }
  }

  static async createConsent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as unknown as AuthenticatedRequest<any, any, CreateConsentDTO>;
      const hospitalId = getHospitalId(authReq.user);
      if (!hospitalId) throw Object.assign(new Error('Hospital ID not found in authentication context.'), { statusCode: 400 });
      const data = await PatientService.createConsent(hospitalId, actor(authReq), authReq.body);
      res.status(201).json({ success: true, data });
    } catch (error: unknown) { next(error); }
  }

  static async revokeConsent(req: Request<{ consentId: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as unknown as AuthenticatedRequest<{ consentId: string }>;
      const hospitalId = getHospitalId(authReq.user);
      if (!hospitalId) throw Object.assign(new Error('Hospital ID not found in authentication context.'), { statusCode: 400 });
      const data = await PatientService.revokeConsent(hospitalId, req.params.consentId, actor(authReq));
      res.status(200).json({ success: true, data });
    } catch (error: unknown) { next(error); }
  }
}
