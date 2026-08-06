import { Request, Response, NextFunction } from 'express';
import { PharmacyService } from './pharmacy.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export class PharmacyController {
  /**
   * Adds new drug item to inventory
   * POST /api/v1/pharmacy/inventory
   */
  static async addDrug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const drug = await PharmacyService.addDrug(req.body, req.user!.organizationId);
      res.status(201).json(new ApiResponse(201, drug, 'Drug added to inventory successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves pharmacy inventory list
   * GET /api/v1/pharmacy/inventory
   */
  static async getInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        category: req.query.category as any,
        lowStock: req.query.lowStock === 'true',
        search: req.query.search as string,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      };

      const result = await PharmacyService.getInventory(req.user!.organizationId, filters);
      res.status(200).json(new ApiResponse(200, result, 'Pharmacy inventory retrieved'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets specific drug item details
   * GET /api/v1/pharmacy/inventory/:id
   */
  static async getDrugById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const drug = await PharmacyService.getDrugById(req.params.id, req.user!.organizationId);
      res.status(200).json(new ApiResponse(200, drug, 'Drug details retrieved'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates drug item details/stock level
   * PATCH /api/v1/pharmacy/inventory/:id
   */
  static async updateDrug(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const updatedDrug = await PharmacyService.updateDrug(
        req.params.id,
        req.body,
        req.user!.organizationId
      );
      res.status(200).json(new ApiResponse(200, updatedDrug, 'Drug record updated successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Dispenses prescription medications
   * POST /api/v1/pharmacy/dispense
   */
  static async dispensePrescription(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const record = await PharmacyService.dispensePrescription(
        req.body,
        req.user!.id,
        req.user!.organizationId
      );
      res.status(201).json(new ApiResponse(201, record, 'Medications dispensed successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets list of past dispense logs
   * GET /api/v1/pharmacy/dispense-history
   */
  static async getDispenseHistory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await PharmacyService.getDispenseHistory(
        req.user!.organizationId,
        page,
        limit
      );
      res.status(200).json(new ApiResponse(200, result, 'Dispense history retrieved'));
    } catch (error) {
      next(error);
    }
  }
}