import { NextFunction, Request, Response } from 'express';

import { hmoAnalyticsService } from './analytics.service.js';
import { AuthenticatedRequest } from './analytics.types.js';

const userOf = (req: Request) => {
  return (req as AuthenticatedRequest).user;
};

const hmoOf = (req: Request) => {
  const user = userOf(req);

  return (
    user?.hmoId ||
    user?.accountId ||
    user?.id ||
    user?._id
  );
};

const actorOf = (req: Request) => {
  const user = userOf(req);

  return (
    user?.id ||
    user?._id ||
    user?.accountId
  );
};

export class HMOAnalyticsController {
  static async summary(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const hmoId = hmoOf(req);

      if (!hmoId) {
        return res.status(400).json({
          success: false,
          message: 'HMO ID not found in authentication context.',
        });
      }

      const data = await hmoAnalyticsService.summary(
        hmoId,
        req.query as any,
      );

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      return next(error);
    }
  }

  static async report(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const hmoId = hmoOf(req);

      if (!hmoId) {
        return res.status(400).json({
          success: false,
          message: 'HMO ID not found in authentication context.',
        });
      }

      const data = await hmoAnalyticsService.generateReport(
        hmoId,
        actorOf(req),
        req.body,
      );

      return res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      return next(error);
    }
  }

  static async reports(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const hmoId = hmoOf(req);

      if (!hmoId) {
        return res.status(400).json({
          success: false,
          message: 'HMO ID not found in authentication context.',
        });
      }

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 12;

      const data = await hmoAnalyticsService.listReports(
        hmoId,
        page,
        limit,
      );

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      return next(error);
    }
  }

  static async reportById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const hmoId = hmoOf(req);

      if (!hmoId) {
        return res.status(400).json({
          success: false,
          message: 'HMO ID not found in authentication context.',
        });
      }

      const data = await hmoAnalyticsService.getReport(
        req.params.id,
        hmoId,
      );

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Report not found.',
        });
      }

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      return next(error);
    }
  }

  static async audit(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const hmoId = hmoOf(req);

      if (!hmoId) {
        return res.status(400).json({
          success: false,
          message: 'HMO ID not found in authentication context.',
        });
      }

      const data = await hmoAnalyticsService.listAudit(
        hmoId,
        req.query as any,
      );

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      return next(error);
    }
  }

  static async consents(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const hmoId = hmoOf(req);

      if (!hmoId) {
        return res.status(400).json({
          success: false,
          message: 'HMO ID not found in authentication context.',
        });
      }

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 15;

      const data = await hmoAnalyticsService.listConsents(
        hmoId,
        page,
        limit,
      );

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      return next(error);
    }
  }

  static async grantConsent(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const hmoId = hmoOf(req);

      if (!hmoId) {
        return res.status(400).json({
          success: false,
          message: 'HMO ID not found in authentication context.',
        });
      }

      const data = await hmoAnalyticsService.upsertConsent(
        hmoId,
        req.body,
        actorOf(req),
      );

      return res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      return next(error);
    }
  }

  static async revokeConsent(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const hmoId = hmoOf(req);

      if (!hmoId) {
        return res.status(400).json({
          success: false,
          message: 'HMO ID not found in authentication context.',
        });
      }

      const data = await hmoAnalyticsService.revokeConsent(
        hmoId,
        req.params.id,
        actorOf(req),
      );

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Consent record not found.',
        });
      }

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      return next(error);
    }
  }

  static async complianceGenerate(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const hmoId = hmoOf(req);

      if (!hmoId) {
        return res.status(400).json({
          success: false,
          message: 'HMO ID not found in authentication context.',
        });
      }

      const data = await hmoAnalyticsService.createComplianceReport(
        hmoId,
        actorOf(req),
        req.body,
      );

      return res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      return next(error);
    }
  }

  static async complianceList(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const hmoId = hmoOf(req);

      if (!hmoId) {
        return res.status(400).json({
          success: false,
          message: 'HMO ID not found in authentication context.',
        });
      }

      const data = await hmoAnalyticsService.listCompliance(
        hmoId,
        req.query as any,
      );

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      return next(error);
    }
  }

  static async complianceStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const hmoId = hmoOf(req);

      if (!hmoId) {
        return res.status(400).json({
          success: false,
          message: 'HMO ID not found in authentication context.',
        });
      }

      const data = await hmoAnalyticsService.updateComplianceStatus(
        hmoId,
        req.params.id,
        String(req.body.status),
        actorOf(req),
        req.body.notes,
      );

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Compliance report not found.',
        });
      }

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      return next(error);
    }
  }
}

export default HMOAnalyticsController;