import { Request, Response, NextFunction } from 'express';
import { inventoryService } from './inventory.service.js';
import {
  InventoryCategory,
  PurchaseOrderStatus,
  EquipmentStatus,
} from './inventory.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hospitalId: string;
    [key: string]: unknown;
  };
}

export class InventoryController {
  public async createSupplier(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const { name, code, contactPerson, email, phone, address, paymentTerms } = req.body;

      const supplier = await inventoryService.createSupplier({
        hospitalId,
        name,
        code,
        contactPerson,
        email,
        phone,
        address,
        paymentTerms,
      });

      res.status(201).json({ success: true, data: supplier });
    } catch (error) {
      next(error);
    }
  }

  public async getSuppliers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const suppliers = await inventoryService.getSuppliers(hospitalId);
      res.status(200).json({ success: true, data: suppliers });
    } catch (error) {
      next(error);
    }
  }

  public async createInventoryItem(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const {
        sku,
        name,
        category,
        description,
        unitOfMeasure,
        quantityOnHand,
        reorderPoint,
        unitCost,
        location,
        supplierId,
      } = req.body;

      const item = await inventoryService.createInventoryItem({
        hospitalId,
        sku,
        name,
        category: category as InventoryCategory,
        description,
        unitOfMeasure,
        quantityOnHand,
        reorderPoint,
        unitCost,
        location,
        supplierId,
      });

      res.status(201).json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  }

  public async getInventoryItems(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const category = req.query.category as InventoryCategory | undefined;
      const reorderAlertsOnly = req.query.reorderAlertsOnly === 'true';
      const search = req.query.search as string | undefined;

      const result = await inventoryService.getInventoryItems(hospitalId, {
        page,
        limit,
        category,
        reorderAlertsOnly,
        search,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async createPurchaseOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const createdById = authReq.user._id;

      const { supplierId, items, expectedDeliveryDate, notes } = req.body;

      const po = await inventoryService.createPurchaseOrder({
        hospitalId,
        supplierId,
        createdById,
        items,
        expectedDeliveryDate,
        notes,
      });

      res.status(201).json({ success: true, data: po });
    } catch (error) {
      next(error);
    }
  }

  public async getPurchaseOrders(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const supplierId = req.query.supplierId as string | undefined;
      const status = req.query.status as PurchaseOrderStatus | undefined;

      const result = await inventoryService.getPurchaseOrders(hospitalId, {
        page,
        limit,
        supplierId,
        status,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async createEquipment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const {
        assetTag,
        name,
        modelNumber,
        serialNumber,
        manufacturer,
        departmentId,
        supplierId,
        status,
        purchaseDate,
        purchaseCost,
        nextServiceDueDate,
        notes,
      } = req.body;

      const equipment = await inventoryService.createEquipment({
        hospitalId,
        assetTag,
        name,
        modelNumber,
        serialNumber,
        manufacturer,
        departmentId,
        supplierId,
        status: status as EquipmentStatus,
        purchaseDate,
        purchaseCost,
        nextServiceDueDate,
        notes,
      });

      res.status(201).json({ success: true, data: equipment });
    } catch (error) {
      next(error);
    }
  }

  public async getEquipment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const departmentId = req.query.departmentId as string | undefined;
      const status = req.query.status as EquipmentStatus | undefined;
      const dueServiceOnly = req.query.dueServiceOnly === 'true';

      const result = await inventoryService.getEquipment(hospitalId, {
        page,
        limit,
        departmentId,
        status,
        dueServiceOnly,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const inventoryController = new InventoryController();