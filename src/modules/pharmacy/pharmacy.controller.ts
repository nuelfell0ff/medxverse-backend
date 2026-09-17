import { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';
import { PharmacyService } from './pharmacy.service.js';
import {
  CreateInventoryItemDTO,
  UpdateStockDTO,
  CreateDispenseRecordDTO,
  CreatePrescriptionDTO,
  CreateFormularyEntryDTO,
} from './pharmacy.types.js';

interface AuthenticatedRequest extends Request {
  account?: {
    accountId?: string;
    hospitalId?: string;
    hospital?: string;
    id?: string;
    _id?: string;
  };
  user?: {
    accountId?: string;
    hospitalId?: string;
    hospital?: string;
    id?: string;
    _id?: string;
  };
}

export class PharmacyController {
  private static getHospitalId(req: Request): string | null {
    const r = req as AuthenticatedRequest;
    const a = r.account;
    const u = r.user;

    const id =
      a?.hospitalId ??
      a?.hospital ??
      u?.hospitalId ??
      u?.hospital ??
      a?.accountId ??
      u?.accountId ??
      a?.id ??
      a?._id ??
      u?.id ??
      u?._id;

    return id ? String(id) : null;
  }

  private static hospital(req: Request, res: Response): string | null {
    const id = PharmacyController.getHospitalId(req);

    if (!id || !Types.ObjectId.isValid(id)) {
      res.status(401).json({
        statusCode: 401,
        success: false,
        message: 'Authenticated hospital context is missing.',
        errors: [],
      });
      return null;
    }

    return id;
  }

  private static getUserId(req: Request): string | null {
    const r = req as AuthenticatedRequest;

    const id =
      r.user?.id ??
      r.user?._id ??
      r.account?.id ??
      r.account?._id;

    return id ? String(id) : null;
  }

  static async createItem(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = PharmacyController.hospital(req, res);
      if (!h) return;

      res.status(201).json({
        success: true,
        data: await PharmacyService.createInventoryItem(
          h,
          req.body as CreateInventoryItemDTO,
        ),
      });
    } catch (e) {
      next(e);
    }
  }

  static async listInventory(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = PharmacyController.hospital(req, res);
      if (!h) return;

      res.json({
        success: true,
        ...(await PharmacyService.getInventory(h, req.query as any)),
      });
    } catch (e) {
      next(e);
    }
  }

  static async getItemById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = PharmacyController.hospital(req, res);
      if (!h) return;

      res.json({
        success: true,
        data: await PharmacyService.getInventoryItemById(
          h,
          req.params.id,
        ),
      });
    } catch (e) {
      next(e);
    }
  }

  static async adjustStock(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = PharmacyController.hospital(req, res);
      if (!h) return;

      if (!Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Invalid inventory item ID.',
          errors: [],
        });
        return;
      }

      const userId = PharmacyController.getUserId(req);

      if (!userId || !Types.ObjectId.isValid(userId)) {
        res.status(401).json({
          success: false,
          statusCode: 401,
          message: 'Authenticated user context is missing.',
          errors: [],
        });
        return;
      }

      const body = req.body ?? {};

      const rawQuantityChange =
        body.quantityChange ??
        body.quantity ??
        body.adjustment ??
        body.change;

      const quantityChange = Number(rawQuantityChange);

      if (!Number.isInteger(quantityChange) || quantityChange === 0) {
        res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Stock adjustment must be a non-zero whole number.',
          errors: [],
        });
        return;
      }

      const reason =
        typeof body.reason === 'string' && body.reason.trim()
          ? body.reason.trim()
          : 'Manual pharmacy stock adjustment';

      const dto: UpdateStockDTO = {
        quantityChange,
        reason,
      };

      res.json({
        success: true,
        data: await PharmacyService.updateStock(
          h,
          userId,
          req.params.id,
          dto,
        ),
      });
    } catch (e) {
      next(e);
    }
  }

  static async createPrescription(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = PharmacyController.hospital(req, res);
      if (!h) return;

      const body = req.body ?? {};
      const prescriberId =
        typeof body.prescriberId === 'string' && body.prescriberId.trim()
          ? body.prescriberId.trim()
          : undefined;
      const prescriberName =
        typeof body.prescriberName === 'string' && body.prescriberName.trim()
          ? body.prescriberName.trim()
          : undefined;

      if (!prescriberId && !prescriberName) {
        res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'A registered prescriber or prescriber name is required.',
          errors: [],
        });
        return;
      }

      if (prescriberId && !Types.ObjectId.isValid(prescriberId)) {
        res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Invalid prescriber ID.',
          errors: [],
        });
        return;
      }

      const dto: CreatePrescriptionDTO = {
        ...(body as CreatePrescriptionDTO),
        prescriberId,
        prescriberName,
      };

      res.status(201).json({
        success: true,
        data: await PharmacyService.createPrescription(h, dto),
      });
    } catch (e) {
      next(e);
    }
  }

  static async listPrescribers(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = PharmacyController.hospital(req, res);
      if (!h) return;

      const search =
        typeof req.query.search === 'string' ? req.query.search.trim() : '';

      if (search.length < 2) {
        res.json({ success: true, data: [] });
        return;
      }

      const terms = search.split(/\s+/).filter(Boolean).slice(0, 4);
      const pattern = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

      const hospitalObjectId = new Types.ObjectId(h);
      const accounts = await mongoose.connection
        .collection('accounts')
        .find({
          $or: [
            { hospitalId: hospitalObjectId },
            { hospitalId: h },
          ],
          $and: [
            {
              $or: [
                { firstName: { $regex: pattern, $options: 'i' } },
                { lastName: { $regex: pattern, $options: 'i' } },
                { email: { $regex: pattern, $options: 'i' } },
                { staffId: { $regex: pattern, $options: 'i' } },
                { name: { $regex: pattern, $options: 'i' } },
                { fullName: { $regex: pattern, $options: 'i' } },
              ],
            },
          ],
        })
        .project({
          _id: 1,
          firstName: 1,
          lastName: 1,
          email: 1,
          staffId: 1,
          name: 1,
          fullName: 1,
        })
        .limit(10)
        .toArray();

      res.json({
        success: true,
        data: accounts.map((account) => ({
          _id: String(account._id),
          firstName: account.firstName || '',
          lastName: account.lastName || '',
          email: account.email || '',
          staffId: account.staffId || '',
          name: account.name || account.fullName || '',
        })),
      });
    } catch (e) {
      next(e);
    }
  }

  static async listPrescriptions(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = PharmacyController.hospital(req, res);
      if (!h) return;

      res.json({
        success: true,
        ...(await PharmacyService.getPrescriptions(
          h,
          req.query as any,
        )),
      });
    } catch (e) {
      next(e);
    }
  }

  static async getPrescriptionById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = PharmacyController.hospital(req, res);
      if (!h) return;

      res.json({
        success: true,
        data: await PharmacyService.getPrescriptionById(
          h,
          req.params.id,
        ),
      });
    } catch (e) {
      next(e);
    }
  }

  static async screenPrescription(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = PharmacyController.hospital(req, res);
      if (!h) return;

      res.json({
        success: true,
        data: await PharmacyService.screenPrescription(
          h,
          req.params.id,
        ),
      });
    } catch (e) {
      next(e);
    }
  }

  static async approvePrescription(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = PharmacyController.hospital(req, res);
      if (!h) return;

      const pharmacistId = PharmacyController.getUserId(req);

      if (!pharmacistId || !Types.ObjectId.isValid(pharmacistId)) {
        res.status(401).json({
          success: false,
          statusCode: 401,
          message: 'Authenticated pharmacist context is missing.',
          errors: [],
        });
        return;
      }

      res.json({
        success: true,
        data: await PharmacyService.approvePrescription(
          h,
          req.params.id,
          pharmacistId,
        ),
      });
    } catch (e) {
      next(e);
    }
  }

  static async dispenseDrugs(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = PharmacyController.hospital(req, res);
      if (!h) return;

      const pharmacistId = PharmacyController.getUserId(req);

      if (!pharmacistId || !Types.ObjectId.isValid(pharmacistId)) {
        res.status(401).json({
          success: false,
          statusCode: 401,
          message: 'Authenticated pharmacist context is missing.',
          errors: [],
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: await PharmacyService.createDispenseRecord(
          h,
          pharmacistId,
          req.body as CreateDispenseRecordDTO,
        ),
      });
    } catch (e) {
      next(e);
    }
  }

  static async retryBilling(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = PharmacyController.hospital(req, res);
      if (!h) return;

      const pharmacistId = PharmacyController.getUserId(req);

      if (!pharmacistId || !Types.ObjectId.isValid(pharmacistId)) {
        res.status(401).json({
          success: false,
          statusCode: 401,
          message: 'Authenticated pharmacist context is missing.',
          errors: [],
        });
        return;
      }

      res.json({
        success: true,
        data: await PharmacyService.retryBilling(h, pharmacistId, req.params.id),
      });
    } catch (e) {
      next(e);
    }
  }

  static async listDispenseRecords(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = PharmacyController.hospital(req, res);
      if (!h) return;

      res.json({
        success: true,
        ...(await PharmacyService.getDispenseRecords(
          h,
          req.query as any,
        )),
      });
    } catch (e) {
      next(e);
    }
  }

  static async createFormulary(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = PharmacyController.hospital(req, res);
      if (!h) return;

      res.status(201).json({
        success: true,
        data: await PharmacyService.createFormularyEntry(
          h,
          req.body as CreateFormularyEntryDTO,
        ),
      });
    } catch (e) {
      next(e);
    }
  }

  static async listFormulary(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = PharmacyController.hospital(req, res);
      if (!h) return;

      res.json({
        success: true,
        ...(await PharmacyService.getFormulary(
          h,
          req.query as any,
        )),
      });
    } catch (e) {
      next(e);
    }
  }

  static async inventoryLedger(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const h = PharmacyController.hospital(req, res);
      if (!h) return;

      res.json({
        success: true,
        data: await PharmacyService.getInventoryLedger(
          h,
          req.params.id,
          Number(req.query.page) || 1,
          Number(req.query.limit) || 50,
        ),
      });
    } catch (e) {
      next(e);
    }
  }
}