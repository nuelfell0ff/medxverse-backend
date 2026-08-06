import { Request, Response, NextFunction } from 'express';
import { LaboratoryService } from './laboratory.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export class LaboratoryController {
  /**
   * Creates a new lab test catalog item
   * POST /api/v1/laboratory/catalog
   */
  static async createLabTestCatalogItem(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const testItem = await LaboratoryService.createLabTestCatalogItem(
        req.body,
        req.user!.organizationId
      );
      res.status(201).json(new ApiResponse(201, testItem, 'Lab test added to catalog successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets available lab test catalog
   * GET /api/v1/laboratory/catalog
   */
  static async getLabTestCatalog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = req.query.category as string;
      const catalog = await LaboratoryService.getLabTestCatalog(
        req.user!.organizationId,
        category
      );
      res.status(200).json(new ApiResponse(200, catalog, 'Lab test catalog retrieved'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets single lab test catalog item
   * GET /api/v1/laboratory/catalog/:id
   */
  static async getLabTestCatalogById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const testItem = await LaboratoryService.getLabTestCatalogById(
        req.params.id,
        req.user!.organizationId
      );
      res.status(200).json(new ApiResponse(200, testItem, 'Catalog test item retrieved'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates lab test catalog item
   * PATCH /api/v1/laboratory/catalog/:id
   */
  static async updateLabTestCatalogItem(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const updated = await LaboratoryService.updateLabTestCatalogItem(
        req.params.id,
        req.body,
        req.user!.organizationId
      );
      res.status(200).json(new ApiResponse(200, updated, 'Catalog item updated successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Creates new lab order for patient
   * POST /api/v1/laboratory/orders
   */
  static async createLabOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await LaboratoryService.createLabOrder(
        req.body,
        req.user!.id,
        req.user!.organizationId
      );
      res.status(201).json(new ApiResponse(201, order, 'Laboratory order created successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets list of lab orders
   * GET /api/v1/laboratory/orders
   */
  static async getLabOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        patientId: req.query.patientId as string,
        status: req.query.status as any,
        priority: req.query.priority as any,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      };

      const result = await LaboratoryService.getLabOrders(req.user!.organizationId, filters);
      res.status(200).json(new ApiResponse(200, result, 'Lab orders retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets specific lab order by ID
   * GET /api/v1/laboratory/orders/:id
   */
  static async getLabOrderById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const order = await LaboratoryService.getLabOrderById(
        req.params.id,
        req.user!.organizationId
      );
      res.status(200).json(new ApiResponse(200, order, 'Lab order details retrieved'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Submits/Updates test item results inside a lab order
   * PATCH /api/v1/laboratory/orders/:orderId/items/:itemId
   */
  static async updateLabTestResult(
    req: Request<{ orderId: string; itemId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const updatedOrder = await LaboratoryService.updateLabTestResult(
        req.params.orderId,
        req.params.itemId,
        req.body,
        req.user!.id,
        req.user!.organizationId
      );
      res.status(200).json(new ApiResponse(200, updatedOrder, 'Lab test result updated successfully'));
    } catch (error) {
      next(error);
    }
  }
}