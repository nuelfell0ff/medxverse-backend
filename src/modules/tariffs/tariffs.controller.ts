import { Request, Response } from 'express';
import { tariffsService } from './tariffs.service.js';

const payload = (body: any) => body?.data ?? body;

interface AuthenticatedUser {
  id?: string;
  _id?: string;
  accountId?: string;
  hmoId?: string;
  organizationId?: string;
  hmo?: {
    _id?: string;
    id?: string;
    hmoId?: string;
  };
  account?: {
    _id?: string;
    id?: string;
    hmoId?: string;
  };
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  account?: {
    _id?: string;
    id?: string;
    hmoId?: string;
    accountId?: string;
  };
  hmoId?: string;
}

/**
 * Resolve the HMO tenant from the authenticated request.
 *
 * The existing authentication layer may expose the tenant as hmoId,
 * accountId, or (for HMO accounts where the account itself is the
 * tenant) the authenticated user's id/_id.
 *
 * We only read trusted authentication context here; no client-supplied
 * query/body hmoId is accepted for tenant isolation.
 */
const hmoIdFromRequest = (req: Request): string => {
  const authReq = req as AuthenticatedRequest;
  const user = authReq.user;
  const account = authReq.account;

  const value =
    user?.hmoId ??
    user?.account?.hmoId ??
    user?.hmo?._id ??
    user?.hmo?.id ??
    user?.hmo?.hmoId ??
    user?.organizationId ??
    account?.hmoId ??
    account?.accountId ??
    authReq.hmoId ??
    user?.accountId ??
    account?._id ??
    account?.id ??
    user?.id ??
    user?._id;

  if (!value) {
    throw new Error('HMO context is required');
  }

  return String(value);
};

export class TariffsController {
  public async create(req: Request, res: Response) {
    const tariff = await tariffsService.createTariff({
      ...payload(req.body),
      hmoId: hmoIdFromRequest(req),
    });

    return res.status(201).json({
      success: true,
      data: tariff,
      message: 'Tariff created successfully',
    });
  }

  public async list(req: Request, res: Response) {
    const result = await tariffsService.getTariffs(
      hmoIdFromRequest(req),
      req.query as any
    );

    return res.json({
      success: true,
      data: result,
    });
  }

  public async getById(req: Request, res: Response) {
    const tariff = await tariffsService.getTariffById(
      req.params.id,
      hmoIdFromRequest(req)
    );

    if (!tariff) {
      return res.status(404).json({
        success: false,
        message: 'Tariff not found',
      });
    }

    return res.json({
      success: true,
      data: tariff,
    });
  }

  public async update(req: Request, res: Response) {
    const tariff = await tariffsService.updateTariff(
      req.params.id,
      hmoIdFromRequest(req),
      payload(req.body)
    );

    if (!tariff) {
      return res.status(404).json({
        success: false,
        message: 'Tariff not found',
      });
    }

    return res.json({
      success: true,
      data: tariff,
      message: 'Tariff updated successfully',
    });
  }

  public async setStatus(req: Request, res: Response) {
    const tariff = await tariffsService.setStatus(
      req.params.id,
      hmoIdFromRequest(req),
      payload(req.body)?.status
    );

    if (!tariff) {
      return res.status(404).json({
        success: false,
        message: 'Tariff not found',
      });
    }

    return res.json({
      success: true,
      data: tariff,
      message: 'Tariff status updated successfully',
    });
  }

  public async quote(req: Request, res: Response) {
    const quote = await tariffsService.quote(
      hmoIdFromRequest(req),
      payload(req.body)
    );

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Active tariff not found',
      });
    }

    return res.json({
      success: true,
      data: quote,
    });
  }

  public async stats(req: Request, res: Response) {
    const stats = await tariffsService.getStats(
      hmoIdFromRequest(req)
    );

    return res.json({
      success: true,
      data: stats,
    });
  }
}

export const tariffsController = new TariffsController();
