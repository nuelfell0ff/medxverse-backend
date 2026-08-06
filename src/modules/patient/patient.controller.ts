import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware.js';
import { PatientService } from './patient.service.js';

export class PatientController {
  public static async createPatient(req: AuthRequest, res: Response): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;
      if (!hospitalId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const patient = await PatientService.createPatient(hospitalId, req.body);
      res.status(201).json({
        success: true,
        message: 'Patient registered successfully',
        data: patient,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to register patient',
      });
    }
  }

  public static async getPatients(req: AuthRequest, res: Response): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;
      if (!hospitalId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { search, category, page, limit } = req.query;

      const result = await PatientService.getPatients(hospitalId, {
        search: search ? String(search) : undefined,
        category: category ? String(category) : undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });

      res.status(200).json({
        success: true,
        data: result.patients,
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch patients',
      });
    }
  }

  public static async getPatientById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;
      if (!hospitalId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const id = req.params.id as string;
      const patient = await PatientService.getPatientById(id, hospitalId);
      res.status(200).json({
        success: true,
        data: patient,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'Patient not found',
      });
    }
  }

  public static async updatePatient(req: AuthRequest, res: Response): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;
      if (!hospitalId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const id = req.params.id as string;
      const patient = await PatientService.updatePatient(id, hospitalId, req.body);
      res.status(200).json({
        success: true,
        message: 'Patient updated successfully',
        data: patient,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update patient',
      });
    }
  }
}