import { Request, Response } from 'express';
import { HMOUtilizationService } from './hmo-utilization.service.js';

const service = new HMOUtilizationService();

const getHmoId = (req: Request): string => {
  const value =
    (req as any).hmoId ||
    (req as any).user?.hmoId ||
    (req as any).user?.organizationId ||
    req.headers['x-hmo-id'];

  if (!value || typeof value !== 'string') {
    const err: any = new Error('HMO context is required');
    err.statusCode = 400;
    throw err;
  }
  return value;
};

const getUserId = (req: Request): string | undefined => {
  const value = (req as any).user?.id || (req as any).user?._id || (req as any).user?.userId;
  return value ? String(value) : undefined;
};

const sendError = (res: Response, err: any) => {
  const status = Number(err?.statusCode) || 400;
  return res.status(status).json({ success: false, message: err?.message || 'Request failed' });
};

export class HMOUtilizationController {
  async summary(req: Request, res: Response) {
    try {
      return res.json({ success: true, data: await service.getSummary(getHmoId(req)) });
    } catch (err) { return sendError(res, err); }
  }

  async events(req: Request, res: Response) {
    try {
      return res.json({ success: true, data: await service.getUtilizationEvents(getHmoId(req), req.query as any) });
    } catch (err) { return sendError(res, err); }
  }

  async createEvent(req: Request, res: Response) {
    try {
      return res.status(201).json({ success: true, data: await service.createUtilizationEvent(getHmoId(req), req.body) });
    } catch (err) { return sendError(res, err); }
  }

  async rules(req: Request, res: Response) {
    try { return res.json({ success: true, data: await service.getRules(getHmoId(req)) }); }
    catch (err) { return sendError(res, err); }
  }

  async createRule(req: Request, res: Response) {
    try { return res.status(201).json({ success: true, data: await service.createRule(getHmoId(req), req.body) }); }
    catch (err) { return sendError(res, err); }
  }

  async updateRule(req: Request, res: Response) {
    try { return res.json({ success: true, data: await service.updateRule(getHmoId(req), req.params.id, req.body) }); }
    catch (err) { return sendError(res, err); }
  }

  async runRules(req: Request, res: Response) {
    try { return res.json({ success: true, data: await service.runRules(getHmoId(req)) }); }
    catch (err) { return sendError(res, err); }
  }

  async alerts(req: Request, res: Response) {
    try { return res.json({ success: true, data: await service.getAlerts(getHmoId(req), req.query as any) }); }
    catch (err) { return sendError(res, err); }
  }

  async reviewAlert(req: Request, res: Response) {
    try {
      return res.json({
        success: true,
        data: await service.reviewAlert(getHmoId(req), req.params.id, req.body, getUserId(req)),
      });
    } catch (err) { return sendError(res, err); }
  }

  async cases(req: Request, res: Response) {
    try { return res.json({ success: true, data: await service.getCases(getHmoId(req), req.query as any) }); }
    catch (err) { return sendError(res, err); }
  }

  async createCase(req: Request, res: Response) {
    try { return res.status(201).json({ success: true, data: await service.createCase(getHmoId(req), req.body) }); }
    catch (err) { return sendError(res, err); }
  }

  async updateCase(req: Request, res: Response) {
    try { return res.json({ success: true, data: await service.updateCase(getHmoId(req), req.params.id, req.body) }); }
    catch (err) { return sendError(res, err); }
  }
}
