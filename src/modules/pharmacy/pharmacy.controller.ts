import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware.js';
import { PharmacyService } from './pharmacy.service.js';
import { PrescriptionStatus } from './pharmacy.types.js';

export class PharmacyController {
  // --- MEDICATIONS ---

  public static async createMedication(req: AuthRequest, res: Response): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;
      if (!hospitalId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const medication = await PharmacyService.createMedication(hospitalId, req.body);
      res.status(201).json({
        success: true,
        message: 'Medication added to inventory successfully',
        data: medication,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  public static async getMedications(req: AuthRequest, res: Response): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;
      if (!hospitalId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { search, category, lowStock, page, limit } = req.query;

      const result = await PharmacyService.getMedications(hospitalId, {
        search: search ? String(search) : undefined,
        category: category ? String(category) : undefined,
        lowStock: lowStock === 'true',
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });

      res.status(200).json({
        success: true,
        data: result.medications,
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async addStockBatch(req: AuthRequest, res: Response): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;
      if (!hospitalId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const id = req.params.id as string;
      const medication = await PharmacyService.addStockBatch(id, hospitalId, req.body);

      res.status(200).json({
        success: true,
        message: 'Stock batch added successfully',
        data: medication,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // --- PRESCRIPTIONS ---

  public static async createPrescription(req: AuthRequest, res: Response): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;
      if (!hospitalId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const prescription = await PharmacyService.createPrescription(hospitalId, req.body);
      res.status(201).json({
        success: true,
        message: 'Prescription issued successfully',
        data: prescription,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  public static async getPrescriptions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;
      if (!hospitalId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { status, patientId, page, limit } = req.query;

      const result = await PharmacyService.getPrescriptions(hospitalId, {
        status: status ? (status as PrescriptionStatus) : undefined,
        patientId: patientId ? String(patientId) : undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });

      res.status(200).json({
        success: true,
        data: result.prescriptions,
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async dispensePrescription(req: AuthRequest, res: Response): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;
      if (!hospitalId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const id = req.params.id as string;
      const prescription = await PharmacyService.dispensePrescription(id, hospitalId, req.body);

      res.status(200).json({
        success: true,
        message: 'Prescription items dispensed successfully',
        data: prescription,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}