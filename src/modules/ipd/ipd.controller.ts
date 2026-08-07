import { Request, Response, NextFunction } from 'express';
import { IpdService } from './ipd.service.js';
import { IIpdQueryFilters, BedStatus } from './ipd.types.js';

export class IpdController {
  // Ward Handlers
  static async createWard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = (req as any).user.hospitalId as string;
      const ward = await IpdService.createWard(hospitalId, req.body);

      res.status(201).json({
        success: true,
        message: 'Ward created successfully',
        data: ward,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getWards(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = (req as any).user.hospitalId as string;
      const wards = await IpdService.getWards(hospitalId);

      res.status(200).json({
        success: true,
        data: wards,
      });
    } catch (error) {
      next(error);
    }
  }

  // Bed Handlers
  static async createBed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = (req as any).user.hospitalId as string;
      const bed = await IpdService.createBed(hospitalId, req.body);

      res.status(201).json({
        success: true,
        message: 'Bed created successfully',
        data: bed,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBedsByWard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = (req as any).user.hospitalId as string;
      const wardId = req.params.wardId as string;

      const beds = await IpdService.getBedsByWard(hospitalId, wardId);

      res.status(200).json({
        success: true,
        data: beds,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateBedStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = (req as any).user.hospitalId as string;
      const bedId = req.params.bedId as string;
      const { status } = req.body as { status: BedStatus };

      const updatedBed = await IpdService.updateBedStatus(hospitalId, bedId, status);

      res.status(200).json({
        success: true,
        message: 'Bed status updated',
        data: updatedBed,
      });
    } catch (error) {
      next(error);
    }
  }

  // Admission Handlers
  static async admitPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = (req as any).user.hospitalId as string;
      const userId = (req as any).user._id as string;

      const admission = await IpdService.admitPatient(hospitalId, userId, req.body);

      res.status(201).json({
        success: true,
        message: 'Patient admitted successfully',
        data: admission,
      });
    } catch (error) {
      next(error);
    }
  }

  static async transferBed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = (req as any).user.hospitalId as string;
      const id = req.params.id as string;

      const updatedAdmission = await IpdService.transferBed(hospitalId, id, req.body);

      res.status(200).json({
        success: true,
        message: 'Patient transferred successfully',
        data: updatedAdmission,
      });
    } catch (error) {
      next(error);
    }
  }

  static async dischargePatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = (req as any).user.hospitalId as string;
      const userId = (req as any).user._id as string;
      const id = req.params.id as string;

      const dischargedAdmission = await IpdService.dischargePatient(hospitalId, id, userId, req.body);

      res.status(200).json({
        success: true,
        message: 'Patient discharged successfully',
        data: dischargedAdmission,
      });
    } catch (error) {
      next(error);
    }
  }

  static async addProgressNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = (req as any).user.hospitalId as string;
      const userId = (req as any).user._id as string;
      const id = req.params.id as string;
      const { note } = req.body as { note: string };

      const updatedAdmission = await IpdService.addProgressNote(hospitalId, id, userId, note);

      res.status(200).json({
        success: true,
        message: 'Progress note added successfully',
        data: updatedAdmission,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAdmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = (req as any).user.hospitalId as string;
      const filters = req.query as unknown as IIpdQueryFilters;

      const result = await IpdService.getAdmissions(hospitalId, filters);

      res.status(200).json({
        success: true,
        data: result.admissions,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAdmissionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = (req as any).user.hospitalId as string;
      const id = req.params.id as string;

      const admission = await IpdService.getAdmissionById(hospitalId, id);

      res.status(200).json({
        success: true,
        data: admission,
      });
    } catch (error) {
      next(error);
    }
  }
}