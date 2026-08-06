import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware.js';
import { OpdService } from './opd.service.js';
import { OpdStatus } from './opd.types.js';

export class OpdController {
  public static async createEncounter(req: AuthRequest, res: Response): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;
      if (!hospitalId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const encounter = await OpdService.createEncounter(hospitalId, req.body);
      res.status(201).json({
        success: true,
        message: 'OPD encounter checked in successfully',
        data: encounter,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to check in OPD encounter',
      });
    }
  }

  public static async getEncounters(req: AuthRequest, res: Response): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;
      if (!hospitalId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { doctorId, patientId, status, date, page, limit } = req.query;

      const result = await OpdService.getEncounters(hospitalId, {
        doctorId: doctorId ? String(doctorId) : undefined,
        patientId: patientId ? String(patientId) : undefined,
        status: status ? (status as OpdStatus) : undefined,
        date: date ? String(date) : undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });

      res.status(200).json({
        success: true,
        data: result.encounters,
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch OPD encounters',
      });
    }
  }

  public static async getEncounterById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;
      if (!hospitalId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const id = req.params.id as string;
      const encounter = await OpdService.getEncounterById(id, hospitalId);

      res.status(200).json({
        success: true,
        data: encounter,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'OPD encounter not found',
      });
    }
  }

  public static async recordVitals(req: AuthRequest, res: Response): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;
      if (!hospitalId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const id = req.params.id as string;
      const encounter = await OpdService.recordVitals(id, hospitalId, req.body);

      res.status(200).json({
        success: true,
        message: 'Vitals recorded successfully',
        data: encounter,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to record vitals',
      });
    }
  }

  public static async updateEncounter(req: AuthRequest, res: Response): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;
      if (!hospitalId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const id = req.params.id as string;
      const encounter = await OpdService.updateEncounter(id, hospitalId, req.body);

      res.status(200).json({
        success: true,
        message: 'OPD encounter updated successfully',
        data: encounter,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update OPD encounter',
      });
    }
  }
}