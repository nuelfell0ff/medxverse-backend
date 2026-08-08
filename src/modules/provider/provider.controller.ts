import { Request, Response, NextFunction } from 'express';
import { providerService } from './provider.service.js';
import { ProviderStatus, ProviderType } from './provider.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hmoId: string;
    [key: string]: unknown;
  };
}

export class ProviderController {
  public async createProvider(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;

      const provider = await providerService.createProvider(hmoId, req.body);
      res.status(201).json({ success: true, data: provider });
    } catch (error) {
      next(error);
    }
  }

  public async getProviders(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const status = req.query.status as ProviderStatus | undefined;
      const type = req.query.type as ProviderType | undefined;
      const state = req.query.state as string | undefined;
      const search = req.query.search as string | undefined;

      const result = await providerService.getProviders(hmoId, {
        page,
        limit,
        status,
        type,
        state,
        search,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async getProviderById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;
      const id = req.params.id as string;

      const provider = await providerService.getProviderById(id, hmoId);
      if (!provider) {
        res.status(404).json({ success: false, message: 'Provider not found' });
        return;
      }

      res.status(200).json({ success: true, data: provider });
    } catch (error) {
      next(error);
    }
  }

  public async updateProvider(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;
      const id = req.params.id as string;

      const updated = await providerService.updateProvider(id, hmoId, req.body);
      if (!updated) {
        res.status(404).json({ success: false, message: 'Provider not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}

export const providerController = new ProviderController();