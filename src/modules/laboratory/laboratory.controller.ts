import { Request, Response, NextFunction } from 'express';
import { LaboratoryService } from './laboratory.service.js';

export class LaboratoryController {
  // Lab Catalog
  public static async createLabTest(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = (req as any).user.hospitalId;
      const test = await LaboratoryService.createLabTest(hospitalId, req.body);
      res.status(201).json({ success: true, data: test });
    } catch (error) {
      next(error);
    }
  }

  public static async getLabTests(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = (req as any).user.hospitalId;
      const filters = {
        search: req.query.search as string,
        category: req.query.category as any,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      };
      const result = await LaboratoryService.getLabTests(hospitalId, filters);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  public static async updateLabTest(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = (req as any).user.hospitalId;
      const test = await LaboratoryService.updateLabTest(req.params.id as string, hospitalId, req.body);
      res.status(200).json({ success: true, data: test });
    } catch (error) {
      next(error);
    }
  }

  // Lab Requests & Workflow
  public static async createLabRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = (req as any).user.hospitalId;
      const labRequest = await LaboratoryService.createLabRequest(hospitalId, req.body);
      res.status(201).json({ success: true, data: labRequest });
    } catch (error) {
      next(error);
    }
  }

  public static async getLabRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = (req as any).user.hospitalId;
      const filters = {
        status: req.query.status as any,
        patientId: req.query.patientId as string,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      };
      const result = await LaboratoryService.getLabRequests(hospitalId, filters);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  public static async getLabRequestById(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = (req as any).user.hospitalId;
      const labRequest = await LaboratoryService.getLabRequestById(req.params.id as string, hospitalId);
      res.status(200).json({ success: true, data: labRequest });
    } catch (error) {
      next(error);
    }
  }

  public static async collectSample(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = (req as any).user.hospitalId;
      const userId = (req as any).user.id;
      const result = await LaboratoryService.collectSample(req.params.id as string, hospitalId, {
        collectedBy: userId,
        sampleTypeNotes: req.body.sampleTypeNotes,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async submitResults(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = (req as any).user.hospitalId;
      const userId = (req as any).user.id;
      const result = await LaboratoryService.submitResults(req.params.id as string, hospitalId, {
        performedBy: userId,
        testResults: req.body.testResults,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}