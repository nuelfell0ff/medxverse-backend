import {
  Request,
  Response,
  NextFunction,
} from 'express';

import {
  PharmacyService,
} from './pharmacy.service.js';

import {
  CreateInventoryItemDTO,
  UpdateStockDTO,
  CreateDispenseRecordDTO,
  GetInventoryQueryDTO,
  GetDispenseQueryDTO,
} from './pharmacy.types.js';

/* =========================================================
   AUTH REQUEST
========================================================= */

interface AuthenticatedRequest<
  Params = Record<string, string>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> extends Request<
    Params,
    ResBody,
    ReqBody,
    ReqQuery
  > {
  user?: {
    id: string;
    hospitalId?: string;
  };
}

/* =========================================================
   CONTROLLER
========================================================= */

export class PharmacyController {
  /* =======================================================
     INVENTORY
  ======================================================= */

  static async createItem(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq =
        req as AuthenticatedRequest<
          {},
          any,
          CreateInventoryItemDTO
        >;

      const user =
        authReq.user!;

      const hospitalId =
        user.hospitalId ||
        user.id;

      const item =
        await PharmacyService.createInventoryItem(
          hospitalId,
          authReq.body
        );

      res.status(201).json({
        success: true,
        data: item,
      });
    } catch (error: unknown) {
      next(error);
    }
  }

  static async listInventory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq =
        req as AuthenticatedRequest<
          {},
          any,
          any,
          GetInventoryQueryDTO
        >;

      const user =
        authReq.user!;

      const hospitalId =
        user.hospitalId ||
        user.id;

      const result =
        await PharmacyService.getInventory(
          hospitalId,
          authReq.query
        );

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error: unknown) {
      next(error);
    }
  }

  static async getItemById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq =
        req as unknown as AuthenticatedRequest<{
          id: string;
        }>;

      const user =
        authReq.user!;

      const hospitalId =
        user.hospitalId ||
        user.id;

      const itemId =
        req.params.id;

      const item =
        await PharmacyService.getInventoryItemById(
          hospitalId,
          itemId
        );

      res.status(200).json({
        success: true,
        data: item,
      });
    } catch (error: unknown) {
      next(error);
    }
  }

  static async adjustStock(
    req: Request<
      { id: string },
      any,
      UpdateStockDTO
    >,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq =
        req as unknown as AuthenticatedRequest<
          { id: string },
          any,
          UpdateStockDTO
        >;

      const user =
        authReq.user!;

      const hospitalId =
        user.hospitalId ||
        user.id;

      const itemId =
        req.params.id;

      const updated =
        await PharmacyService.updateStock(
          hospitalId,
          itemId,
          authReq.body
        );

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: unknown) {
      next(error);
    }
  }

  /* =======================================================
     BILLING PRICING CATALOGUE
  ======================================================= */

  static async listPricingCatalogues(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq =
        req as AuthenticatedRequest<{}, any, any, any>;

      const user = authReq.user!;
      const hospitalId = user.hospitalId || user.id;

      const result =
        await PharmacyService.getPricingCatalogues(
          hospitalId,
          authReq.query as any
        );

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error: unknown) {
      next(error);
    }
  }

  /* =======================================================
     DISPENSING
  ======================================================= */

  static async dispenseDrugs(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq =
        req as AuthenticatedRequest<
          {},
          any,
          CreateDispenseRecordDTO
        >;

      const user =
        authReq.user!;

      const hospitalId =
        user.hospitalId ||
        user.id;

      const record =
        await PharmacyService.createDispenseRecord(
          hospitalId,
          user.id,
          authReq.body
        );

      res.status(201).json({
        success: true,
        data: record,
      });
    } catch (error: unknown) {
      next(error);
    }
  }

  /* =======================================================
     RETRY BILLING
  ======================================================= */

  static async retryBilling(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq =
        req as unknown as AuthenticatedRequest<{
          id: string;
        }>;

      const user =
        authReq.user!;

      const hospitalId =
        user.hospitalId ||
        user.id;

      const record =
        await PharmacyService.retryBilling(
          hospitalId,
          user.id,
          req.params.id
        );

      res.status(200).json({
        success: true,
        message:
          'Pharmacy billing retry completed.',
        data: record,
      });
    } catch (error: unknown) {
      next(error);
    }
  }

  /* =======================================================
     LIST DISPENSE RECORDS
  ======================================================= */

  static async listDispenseRecords(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq =
        req as AuthenticatedRequest<
          {},
          any,
          any,
          GetDispenseQueryDTO
        >;

      const user =
        authReq.user!;

      const hospitalId =
        user.hospitalId ||
        user.id;

      const result =
        await PharmacyService.getDispenseRecords(
          hospitalId,
          authReq.query
        );

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error: unknown) {
      next(error);
    }
  }
}