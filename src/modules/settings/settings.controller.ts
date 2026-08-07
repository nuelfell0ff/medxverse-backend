import { Request, Response, NextFunction } from 'express';
import { settingsService } from './settings.service.js';
import { IntegrationType, ThemeMode } from './settings.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hospitalId: string;
    [key: string]: unknown;
  };
}

export class SettingsController {
  public async upsertSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const updatedById = authReq.user._id;

      const { profile, branding, defaultLanguage, timeZone, currency, theme } = req.body;

      const settings = await settingsService.upsertSettings({
        hospitalId,
        profile,
        branding,
        defaultLanguage,
        timeZone,
        currency,
        theme: theme as ThemeMode,
        updatedById,
      });

      res.status(200).json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  public async getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const settings = await settingsService.getSettings(hospitalId);
      res.status(200).json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  public async createClinicalTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const createdById = authReq.user._id;

      const { title, category, departmentId, content } = req.body;

      const template = await settingsService.createClinicalTemplate({
        hospitalId,
        title,
        category,
        departmentId,
        content,
        createdById,
      });

      res.status(201).json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  public async getClinicalTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const category = req.query.category as string | undefined;

      const templates = await settingsService.getClinicalTemplates(hospitalId, category);
      res.status(200).json({ success: true, data: templates });
    } catch (error) {
      next(error);
    }
  }

  public async createIntegration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const { name, type, apiKey, apiSecret, baseUrl, configOptions } = req.body;

      const integration = await settingsService.createIntegration({
        hospitalId,
        name,
        type: type as IntegrationType,
        apiKey,
        apiSecret,
        baseUrl,
        configOptions,
      });

      res.status(201).json({ success: true, data: integration });
    } catch (error) {
      next(error);
    }
  }

  public async getIntegrations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const integrations = await settingsService.getIntegrations(hospitalId);
      res.status(200).json({ success: true, data: integrations });
    } catch (error) {
      next(error);
    }
  }
}

export const settingsController = new SettingsController();