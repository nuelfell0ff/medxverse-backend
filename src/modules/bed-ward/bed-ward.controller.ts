import type { NextFunction, Request, Response } from 'express';
import { bedWardService } from './bed-ward.service.js';
import { occupancyForecastService } from './forecasting.service.js';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';
import { BedStatus, TransferRequestStatus } from './bed-ward.types.js';

function hospitalId(req: AuthRequest): string {
  const id = req.user?.hospitalId || req.account?.accountId;
  if (!id) throw new Error('Hospital context missing.');
  return id;
}

function actorId(req: AuthRequest): string {
  const id = req.user?._id || req.account?.accountId;
  if (!id) throw new Error('Authenticated user context missing.');
  return id;
}

export class BedWardController {
  public async createWard(req: Request, res: Response, next: NextFunction) {
    try {
      const value = await bedWardService.createWard({ ...req.body, hospitalId: hospitalId(req as AuthRequest) });
      res.status(201).json({ success: true, ward: value });
    } catch (error) { next(error); }
  }

  public async startWardCleaning(req: Request, res: Response, next: NextFunction) {
    try { const value = await bedWardService.startWardCleaning(req.params.id, hospitalId(req as AuthRequest), actorId(req as AuthRequest), req.body?.notes); res.json({ success: true, ward: value }); }
    catch (error) { next(error); }
  }

  public async completeWardCleaning(req: Request, res: Response, next: NextFunction) {
    try { const value = await bedWardService.completeWardCleaning(req.params.id, hospitalId(req as AuthRequest), actorId(req as AuthRequest), req.body?.notes); res.json({ success: true, ward: value }); }
    catch (error) { next(error); }
  }

  public async getWards(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, wards: await bedWardService.getWards(hospitalId(req as AuthRequest)) }); }
    catch (error) { next(error); }
  }

  public async createBed(req: Request, res: Response, next: NextFunction) {
    try {
      const value = await bedWardService.createBed({ ...req.body, hospitalId: hospitalId(req as AuthRequest) });
      res.status(201).json({ success: true, bed: value });
    } catch (error) { next(error); }
  }

  public async getBeds(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await bedWardService.getBeds(hospitalId(req as AuthRequest), {
        wardId: req.query.wardId as string | undefined,
        status: req.query.status as BedStatus | undefined,
        bedType: req.query.bedType as string | undefined,
        department: req.query.department as string | undefined,
        search: req.query.search as string | undefined,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 50,
      });
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  public async getBed(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, bed: await bedWardService.getBedById(req.params.id, hospitalId(req as AuthRequest)) }); }
    catch (error) { next(error); }
  }

  public async transitionBed(req: Request, res: Response, next: NextFunction) {
    try {
      const value = await bedWardService.transitionBed(req.params.id, hospitalId(req as AuthRequest), {
        ...req.body,
        actorId: actorId(req as AuthRequest),
      });
      res.json({ success: true, bed: value });
    } catch (error) { next(error); }
  }

  public async completeCleaning(req: Request, res: Response, next: NextFunction) {
    try {
      const value = await bedWardService.completeCleaning(req.params.id, hospitalId(req as AuthRequest), {
        ...req.body,
        actorId: actorId(req as AuthRequest),
      });
      res.json({ success: true, bed: value });
    } catch (error) { next(error); }
  }

  public async suggest(req: Request, res: Response, next: NextFunction) {
    try {
      const suggestions = await bedWardService.suggestBeds({
        ...req.body,
        hospitalId: hospitalId(req as AuthRequest),
        requestedById: actorId(req as AuthRequest),
      });
      res.json({ success: true, suggestions });
    } catch (error) { next(error); }
  }

  public async confirmAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const assignment = await bedWardService.confirmAssignment({
        ...req.body,
        requestedById: actorId(req as AuthRequest),
      }, hospitalId(req as AuthRequest));
      res.status(201).json({ success: true, assignment });
    } catch (error) { next(error); }
  }

  public async releaseAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await bedWardService.releaseAssignment(
        req.params.id,
        hospitalId(req as AuthRequest),
        actorId(req as AuthRequest),
        req.body?.reason,
        req.body?.expectedVersion,
      );
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  public async createTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const request = await bedWardService.createTransferRequest({
        ...req.body,
        hospitalId: hospitalId(req as AuthRequest),
        requestedById: actorId(req as AuthRequest),
      });
      res.status(201).json({ success: true, ...request });
    } catch (error) { next(error); }
  }

  public async completeTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await bedWardService.completeTransfer(req.params.id, hospitalId(req as AuthRequest), actorId(req as AuthRequest));
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  public async getTransfers(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        requests: await bedWardService.getTransferRequests(
          hospitalId(req as AuthRequest),
          req.query.status as TransferRequestStatus | undefined,
        ),
      });
    } catch (error) { next(error); }
  }

  public async getDashboard(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, dashboard: await bedWardService.getDashboard(hospitalId(req as AuthRequest)) }); }
    catch (error) { next(error); }
  }

  public async getHistory(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, events: await bedWardService.getStatusHistory(req.params.id, hospitalId(req as AuthRequest), Number(req.query.limit) || 100) }); }
    catch (error) { next(error); }
  }

  public async generateForecast(req: Request, res: Response, next: NextFunction) {
    try {
      const forecasts = await occupancyForecastService.generate(
        hospitalId(req as AuthRequest),
        Number(req.body?.horizonDays || req.query.horizonDays || 7),
        (req.body?.wardId || req.query.wardId) as string | undefined,
      );
      res.status(201).json({ success: true, forecasts });
    } catch (error) { next(error); }
  }

  public async getForecast(req: Request, res: Response, next: NextFunction) {
    try {
      const forecasts = await bedWardService.getForecasts(
        hospitalId(req as AuthRequest),
        req.query.wardId as string | undefined,
        Number(req.query.horizonDays) || 7,
      );
      res.json({ success: true, forecasts });
    } catch (error) { next(error); }
  }
}

export const bedWardController = new BedWardController();
