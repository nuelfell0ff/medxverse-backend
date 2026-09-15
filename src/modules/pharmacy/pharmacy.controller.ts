import { Request, Response, NextFunction } from 'express';
import { PharmacyService } from './pharmacy.service.js';
import {
  CreateInventoryItemDTO, UpdateStockDTO, CreateDispenseRecordDTO,
  CreatePrescriptionDTO, CreateFormularyEntryDTO,
} from './pharmacy.types.js';

interface AuthenticatedRequest extends Request {
  account?: { accountId?: string; hospitalId?: string; hospital?: string; id?: string; _id?: string };
  user?: { accountId?: string; hospitalId?: string; hospital?: string; id?: string; _id?: string };
}

export class PharmacyController {
  private static getHospitalId(req: Request): string | null {
    const r = req as AuthenticatedRequest;
    const a = r.account;
    const u = r.user;
    const id = a?.accountId ?? a?.hospitalId ?? a?.hospital ?? a?.id ?? a?._id
      ?? u?.hospitalId ?? u?.hospital ?? u?.accountId ?? u?.id ?? u?._id;
    return id ? String(id) : null;
  }

  private static hospital(req: Request, res: Response): string | null {
    const id = PharmacyController.getHospitalId(req);
    if (!id) {
      res.status(401).json({ statusCode: 401, success: false, message: 'Authenticated hospital context is missing.', errors: [] });
      return null;
    }
    return id;
  }

  static async createItem(req: Request, res: Response, next: NextFunction) {
    try { const h = PharmacyController.hospital(req, res); if (!h) return; res.status(201).json({ success: true, data: await PharmacyService.createInventoryItem(h, req.body as CreateInventoryItemDTO) }); } catch (e) { next(e); }
  }

  static async listInventory(req: Request, res: Response, next: NextFunction) {
    try { const h = PharmacyController.hospital(req, res); if (!h) return; res.json({ success: true, ...(await PharmacyService.getInventory(h, req.query as any)) }); } catch (e) { next(e); }
  }

  static async getItemById(req: Request<{id:string}>, res: Response, next: NextFunction) {
    try { const h = PharmacyController.hospital(req, res); if (!h) return; res.json({ success: true, data: await PharmacyService.getInventoryItemById(h, req.params.id) }); } catch (e) { next(e); }
  }

  static async adjustStock(req: Request<{id:string}>, res: Response, next: NextFunction) {
    try { const h = PharmacyController.hospital(req, res); if (!h) return; const r = req as AuthenticatedRequest; const userId = String(r.user?.id ?? r.user?._id ?? r.account?.accountId ?? ''); if (!userId) throw Object.assign(new Error('Authenticated user context is missing.'), { statusCode: 401 }); res.json({ success: true, data: await PharmacyService.updateStock(h, userId, req.params.id, req.body as UpdateStockDTO) }); } catch (e) { next(e); }
  }

  static async createPrescription(req: Request, res: Response, next: NextFunction) {
    try { const h = PharmacyController.hospital(req, res); if (!h) return; res.status(201).json({ success: true, data: await PharmacyService.createPrescription(h, req.body as CreatePrescriptionDTO) }); } catch (e) { next(e); }
  }

  static async listPrescriptions(req: Request, res: Response, next: NextFunction) {
    try { const h = PharmacyController.hospital(req, res); if (!h) return; res.json({ success: true, ...(await PharmacyService.getPrescriptions(h, req.query as any)) }); } catch (e) { next(e); }
  }

  static async getPrescriptionById(req: Request<{id:string}>, res: Response, next: NextFunction) {
    try { const h = PharmacyController.hospital(req, res); if (!h) return; res.json({ success: true, data: await PharmacyService.getPrescriptionById(h, req.params.id) }); } catch (e) { next(e); }
  }

  static async screenPrescription(req: Request<{id:string}>, res: Response, next: NextFunction) {
    try { const h = PharmacyController.hospital(req, res); if (!h) return; res.json({ success: true, data: await PharmacyService.screenPrescription(h, req.params.id) }); } catch (e) { next(e); }
  }

  static async approvePrescription(req: Request<{id:string}>, res: Response, next: NextFunction) {
    try { const h = PharmacyController.hospital(req, res); if (!h) return; const r = req as AuthenticatedRequest; const pharmacistId = String(r.user?.id ?? r.user?._id ?? r.account?.accountId ?? ''); res.json({ success: true, data: await PharmacyService.approvePrescription(h, req.params.id, pharmacistId) }); } catch (e) { next(e); }
  }

  static async dispenseDrugs(req: Request, res: Response, next: NextFunction) {
    try { const h = PharmacyController.hospital(req, res); if (!h) return; const r = req as AuthenticatedRequest; const pharmacistId = String(r.user?.id ?? r.user?._id ?? r.account?.accountId ?? ''); if (!pharmacistId) throw Object.assign(new Error('Authenticated pharmacist context is missing.'), { statusCode: 401 }); res.status(201).json({ success: true, data: await PharmacyService.createDispenseRecord(h, pharmacistId, req.body as CreateDispenseRecordDTO) }); } catch (e) { next(e); }
  }

  static async listDispenseRecords(req: Request, res: Response, next: NextFunction) {
    try { const h = PharmacyController.hospital(req, res); if (!h) return; res.json({ success: true, ...(await PharmacyService.getDispenseRecords(h, req.query as any)) }); } catch (e) { next(e); }
  }

  static async createFormulary(req: Request, res: Response, next: NextFunction) {
    try { const h = PharmacyController.hospital(req, res); if (!h) return; res.status(201).json({ success: true, data: await PharmacyService.createFormularyEntry(h, req.body as CreateFormularyEntryDTO) }); } catch (e) { next(e); }
  }

  static async listFormulary(req: Request, res: Response, next: NextFunction) {
    try { const h = PharmacyController.hospital(req, res); if (!h) return; res.json({ success: true, ...(await PharmacyService.getFormulary(h, req.query as any)) }); } catch (e) { next(e); }
  }

  static async inventoryLedger(req: Request<{id:string}>, res: Response, next: NextFunction) {
    try { const h = PharmacyController.hospital(req, res); if (!h) return; res.json({ success: true, data: await PharmacyService.getInventoryLedger(h, req.params.id, Number(req.query.page) || 1, Number(req.query.limit) || 50) }); } catch (e) { next(e); }
  }
}
