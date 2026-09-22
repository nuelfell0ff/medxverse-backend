import { Request, Response } from 'express';

import { hmoSettingsService } from './settings.service.js';
import { UpdateHMOSettingsInput } from './settings.types.js';

interface AuthenticatedRequest
  extends Request {
  user?: {
    hmoId?: string;
    accountId?: string;
    accountType?: string;
    [key: string]: unknown;
  };

  account?: {
    accountId?: string;
    hmoId?: string;
    accountType?: string;
    [key: string]: unknown;
  };
}

const getHmoId = (
  req: Request
): string => {
  const authReq =
    req as AuthenticatedRequest;

  const hmoId =
    authReq.user?.hmoId ??
    authReq.account?.hmoId ??
    (
      authReq.user?.accountType === 'HMO'
        ? authReq.user?.accountId
        : undefined
    ) ??
    (
      authReq.account?.accountType === 'HMO'
        ? authReq.account?.accountId
        : undefined
    );

  if (!hmoId) {
    throw new Error(
      'HMO context is required'
    );
  }

  return String(hmoId);
};

const bodyData = (
  body: unknown
): unknown => {
  if (
    body &&
    typeof body === 'object' &&
    'data' in body
  ) {
    return (
      body as {
        data?: unknown;
      }
    ).data;
  }

  return body;
};

export class HMOSettingsController {
  public async get(
    req: Request,
    res: Response
  ) {
    const settings =
      await hmoSettingsService.getSettings(
        getHmoId(req)
      );

    return res.json({
      success: true,
      data: settings,
    });
  }

  public async update(
    req: Request,
    res: Response
  ) {
    const input =
      bodyData(req.body) as
        | UpdateHMOSettingsInput
        | undefined;

    if (
      !input ||
      typeof input !== 'object' ||
      Array.isArray(input)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'A valid settings object is required',
      });
    }

    const settings =
      await hmoSettingsService.updateSettings(
        getHmoId(req),
        input
      );

    return res.json({
      success: true,
      data: settings,
      message:
        'HMO settings updated successfully',
    });
  }

  public async reset(
    req: Request,
    res: Response
  ) {
    const settings =
      await hmoSettingsService.resetSettings(
        getHmoId(req)
      );

    return res.json({
      success: true,
      data: settings,
      message:
        'HMO settings reset successfully',
    });
  }
}

export const hmoSettingsController =
  new HMOSettingsController();