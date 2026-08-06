import { Request, Response, NextFunction } from 'express';
import { HmoService } from './hmo.service.js';

export class HmoController {
  public static async verifyEligibility(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = (req as any).user.hospitalId;
      const { policyNumber, hmoId } = req.body;
      const result = await HmoService.verifyEligibility(hospitalId, policyNumber, hmoId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async requestPreAuthorization(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = (req as any).user.hospitalId;
      const preAuth = await HmoService.requestPreAuthorization(hospitalId, req.body);
      res.status(201).json({ success: true, data: preAuth });
    } catch (error) {
      next(error);
    }
  }

  public static async submitClaim(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = (req as any).user.hospitalId;
      const claim = await HmoService.submitClaim(hospitalId, req.body);
      res.status(201).json({ success: true, data: claim });
    } catch (error) {
      next(error);
    }
  }

  public static async getClaims(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = (req as any).user.hospitalId;
      const filters = {
        status: req.query.status as string,
        patientId: req.query.patientId as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      };
      const result = await HmoService.getClaims(hospitalId, filters);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  public static async getClaimById(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = (req as any).user.hospitalId;
      const claim = await HmoService.getClaimById(req.params.id as string, hospitalId);
      res.status(200).json({ success: true, data: claim });
    } catch (error) {
      next(error);
    }
  }
}