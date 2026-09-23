import { Request, Response } from 'express';
import { hmoProviderService } from './provider.service.js';
import { AccreditationStatus, CreateProviderInput, ProviderStatus, ProviderType, UpdateProviderAccreditationInput, UpdateProviderStatusInput } from './provider.types.js';

interface AuthenticatedRequest extends Request {
  user?: { hmoId?: string; accountId?: string; organizationId?: string; _id?: string; id?: string; account?: { hmoId?: string; accountId?: string; _id?: string; id?: string }; hmo?: { hmoId?: string; _id?: string; id?: string } };
  account?: { accountId?: string; hmoId?: string; _id?: string; id?: string };
  hmoId?: string;
}

const hmoIdFromRequest = (req: Request): string => {
  const request = req as AuthenticatedRequest;
  const user = request.user;
  const account = request.account;
  const value = user?.hmoId ?? user?.hmo?.hmoId ?? user?.hmo?._id ?? user?.hmo?.id ?? user?.organizationId ?? user?.account?.hmoId ?? account?.hmoId ?? request.hmoId ?? user?.accountId ?? user?.account?.accountId ?? account?.accountId ?? account?._id ?? account?.id ?? user?.id ?? user?._id;
  if (!value) throw Object.assign(new Error('HMO context is required'), { statusCode: 403 });
  return String(value);
};

const body = <T>(value: unknown): T => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {} as T;
  const record = value as Record<string, unknown>;
  return record.data && typeof record.data === 'object' && !Array.isArray(record.data) ? record.data as T : record as T;
};

const queryEnum = <T extends string>(value: unknown, values: readonly T[]): T | undefined => {
  if (typeof value !== 'string' || !value) return undefined;
  if (!values.includes(value as T)) throw Object.assign(new Error(`Invalid query value: ${value}`), { statusCode: 400 });
  return value as T;
};

export class HMOProviderController {
  public async create(req: Request, res: Response): Promise<void> {
    const provider = await hmoProviderService.createProvider(hmoIdFromRequest(req), body<CreateProviderInput>(req.body));
    res.status(201).json({ success: true, data: provider, message: 'Provider created successfully' });
  }

  public async list(req: Request, res: Response): Promise<void> {
    const result = await hmoProviderService.getProviders(hmoIdFromRequest(req), {
      page: req.query.page as string,
      limit: req.query.limit as string,
      search: req.query.search as string,
      network: req.query.network as string,
      type: queryEnum(req.query.type, Object.values(ProviderType)),
      status: queryEnum(req.query.status, Object.values(ProviderStatus)),
      accreditationStatus: queryEnum(req.query.accreditationStatus, Object.values(AccreditationStatus)),
    });
    res.json({ success: true, data: result });
  }

  public async stats(req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: await hmoProviderService.getStats(hmoIdFromRequest(req)) });
  }

  public async getById(req: Request, res: Response): Promise<void> {
    const provider = await hmoProviderService.getProviderById(req.params.id, hmoIdFromRequest(req));
    if (!provider) { res.status(404).json({ success: false, message: 'Provider not found' }); return; }
    res.json({ success: true, data: provider });
  }

  public async update(req: Request, res: Response): Promise<void> {
    const provider = await hmoProviderService.updateProvider(req.params.id, hmoIdFromRequest(req), body(req.body));
    if (!provider) { res.status(404).json({ success: false, message: 'Provider not found' }); return; }
    res.json({ success: true, data: provider, message: 'Provider updated successfully' });
  }

  public async setStatus(req: Request, res: Response): Promise<void> {
    const input = body<UpdateProviderStatusInput>(req.body);
    const status = queryEnum(input.status, Object.values(ProviderStatus));
    if (!status) throw Object.assign(new Error('Provider status is required'), { statusCode: 400 });
    const provider = await hmoProviderService.updateProviderStatus(req.params.id, hmoIdFromRequest(req), { status, reason: input.reason });
    if (!provider) { res.status(404).json({ success: false, message: 'Provider not found' }); return; }
    res.json({ success: true, data: provider, message: 'Provider status updated successfully' });
  }

  public async accreditation(req: Request, res: Response): Promise<void> {
    const input = body<UpdateProviderAccreditationInput>(req.body);
    const status = queryEnum(input.status, Object.values(AccreditationStatus));
    if (!status) throw Object.assign(new Error('Accreditation status is required'), { statusCode: 400 });
    const provider = await hmoProviderService.updateAccreditation(req.params.id, hmoIdFromRequest(req), { ...input, status });
    if (!provider) { res.status(404).json({ success: false, message: 'Provider not found' }); return; }
    res.json({ success: true, data: provider, message: 'Provider accreditation updated successfully' });
  }

  public async performance(req: Request, res: Response): Promise<void> {
    const result = await hmoProviderService.getPerformance(req.params.id, hmoIdFromRequest(req));
    if (!result) { res.status(404).json({ success: false, message: 'Provider not found' }); return; }
    res.json({ success: true, data: result });
  }
}

export const hmoProviderController = new HMOProviderController();
