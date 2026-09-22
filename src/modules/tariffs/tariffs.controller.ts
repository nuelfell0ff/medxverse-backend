import { Request, Response } from 'express';
import { tariffsService } from './tariffs.service.js';

const payload = (body: any) => body?.data ?? body;

const hmoIdFromRequest = (req: Request): string => {
  const value =
    (req as any).user?.hmoId ??
    (req as any).account?.hmoId ??
    (req as any).hmoId;

  if (!value) throw new Error('HMO context is required');
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

    return res.json({ success: true, data: tariff });
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
    const stats = await tariffsService.getStats(hmoIdFromRequest(req));

    return res.json({
      success: true,
      data: stats,
    });
  }
}

export const tariffsController = new TariffsController();
