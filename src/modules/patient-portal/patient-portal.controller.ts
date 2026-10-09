import { Request, Response } from 'express';
import { PatientPortalService } from './patient-portal.service.js';

export class PatientPortalController {
  static async hospitals(_req: Request, res: Response): Promise<void> {
    try {
      const hospitals = await PatientPortalService.listHospitals();
      res.status(200).json({
        success: true,
        message: 'Hospitals loaded successfully.',
        data: hospitals,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error?.message || 'Unable to load hospitals.',
      });
    }
  }

  static async register(req: Request, res: Response): Promise<void> {
    try {
      const data = await PatientPortalService.register(req.body || {});
      res.status(201).json({
        success: true,
        message: 'Patient portal account created.',
        data,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error?.message || 'Patient registration failed.',
      });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const data = await PatientPortalService.login(req.body || {});
      res.status(200).json({
        success: true,
        message: 'Signed in successfully.',
        data,
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error?.message || 'Patient login failed.',
      });
    }
  }
}
