import { Request, Response, NextFunction } from 'express';
import { PatientService } from './patient.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export class PatientController {
  /**
   * Registers a new patient
   * POST /api/v1/patients
   */
  static async createPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patient = await PatientService.createPatient(req.body, req.user!.organizationId);
      res.status(201).json(new ApiResponse(201, patient, 'Patient registered successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves paginated patients list
   * GET /api/v1/patients
   */
  static async getPatients(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        insuranceType: req.query.insuranceType as any,
        hmoProvider: req.query.hmoProvider as string,
        gender: req.query.gender as any,
        search: req.query.search as string,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      };

      const result = await PatientService.getPatients(req.user!.organizationId, filters);
      res.status(200).json(new ApiResponse(200, result, 'Patient directory retrieved'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets patient by Mongo ID
   * GET /api/v1/patients/:id
   */
  static async getPatientById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const patient = await PatientService.getPatientById(req.params.id, req.user!.organizationId);
      res.status(200).json(new ApiResponse(200, patient, 'Patient details retrieved'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets patient by MRN
   * GET /api/v1/patients/mrn/:mrn
   */
  static async getPatientByMRN(
    req: Request<{ mrn: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const patient = await PatientService.getPatientByMRN(req.params.mrn, req.user!.organizationId);
      res.status(200).json(new ApiResponse(200, patient, 'Patient details retrieved'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates patient record
   * PATCH /api/v1/patients/:id
   */
  static async updatePatient(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const updatedPatient = await PatientService.updatePatient(
        req.params.id,
        req.body,
        req.user!.organizationId
      );
      res.status(200).json(new ApiResponse(200, updatedPatient, 'Patient record updated'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Soft deletes / archives patient
   * DELETE /api/v1/patients/:id
   */
  static async archivePatient(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await PatientService.archivePatient(req.params.id, req.user!.organizationId);
      res.status(200).json(new ApiResponse(200, result, 'Patient record archived successfully'));
    } catch (error) {
      next(error);
    }
  }
}