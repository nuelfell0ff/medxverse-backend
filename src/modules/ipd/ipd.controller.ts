import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware.js';
import { IpdService } from './ipd.service.js';
import { IpdStatus } from './ipd.types.js';

export class IpdController {
  public static async admitPatient(req: AuthRequest, res: Response): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;
      if (!hospitalId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const admission = await IpdService.admitPatient(hospitalId, req.body);
      res.status(201).json({
        success: true,
        message: 'Patient admitted into IPD successfully',
        data: admission,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to admit patient',
      });
    }
  }

  public static async getAdmissions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;
      if (!hospitalId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { status, ward, doctorId, patientId, page, limit } = req.query;

      const result = await IpdService.getAdmissions(hospitalId, {
        status: status ? (status as IpdStatus) : undefined,
        ward: ward ? String(ward) : undefined,
        doctorId: doctorId ? String(doctorId) : undefined,
        patientId: patientId ? String(patientId) : undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });

      res.status(200).json({
        success: true,
        data: result.admissions,
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch IPD admissions',
      });
    }
  }

  public static async getAdmissionById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;
      if (!hospitalId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const id = req.params.id as string;
      const admission = await IpdService.getAdmissionById(id, hospitalId);

      res.status(200).json({
        success: true,
        data: admission,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'IPD admission not found',
      });
    }
  }

  public static async dischargePatient(req: AuthRequest, res: Response): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;
      if (!hospitalId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const id = req.params.id as string;
      const admission = await IpdService.dischargePatient(id, hospitalId, req.body);

      res.status(200).json({
        success: true,
        message: 'Patient discharged successfully',
        data: admission,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to discharge patient',
      });
    }
  }

  public static async addProgressNote(req: AuthRequest, res: Response): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;
      if (!hospitalId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const id = req.params.id as string;
      const admission = await IpdService.addProgressNote(id, hospitalId, req.body);

      res.status(200).json({
        success: true,
        message: 'Progress note added successfully',
        data: admission,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to add progress note',
      });
    }
  }

  public static async updateAdmission(req: AuthRequest, res: Response): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;
      if (!hospitalId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const id = req.params.id as string;
      const admission = await IpdService.updateAdmission(id, hospitalId, req.body);

      res.status(200).json({
        success: true,
        message: 'Admission details updated successfully',
        data: admission,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update admission details',
      });
    }
  }
}