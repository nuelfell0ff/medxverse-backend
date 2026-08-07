import { Request, Response, NextFunction } from 'express';
import { administrationService } from './administration.service.js';
import { AuditAction } from './administration.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hospitalId: string;
    [key: string]: unknown;
  };
}

export class AdministrationController {
  public async createBranch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const { name, code, address, phone, email } = req.body;

      const branch = await administrationService.createBranch({
        hospitalId,
        name,
        code,
        address,
        phone,
        email,
      });

      res.status(201).json({ success: true, data: branch });
    } catch (error) {
      next(error);
    }
  }

  public async getBranches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const branches = await administrationService.getBranches(hospitalId);
      res.status(200).json({ success: true, data: branches });
    } catch (error) {
      next(error);
    }
  }

  public async createRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const { name, description, permissions } = req.body;

      const role = await administrationService.createRole({
        hospitalId,
        name,
        description,
        permissions,
      });

      res.status(201).json({ success: true, data: role });
    } catch (error) {
      next(error);
    }
  }

  public async getRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const roles = await administrationService.getRoles(hospitalId);
      res.status(200).json({ success: true, data: roles });
    } catch (error) {
      next(error);
    }
  }

  public async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const userId = req.query.userId as string | undefined;
      const action = req.query.action as AuditAction | undefined;
      const resource = req.query.resource as string | undefined;

      const result = await administrationService.getAuditLogs(hospitalId, {
        page,
        limit,
        userId,
        action,
        resource,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async getUserDeviceSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const userId = req.params.userId ? (req.params.userId as string) : authReq.user._id;

      const sessions = await administrationService.getUserDeviceSessions(userId, hospitalId);
      res.status(200).json({ success: true, data: sessions });
    } catch (error) {
      next(error);
    }
  }

  public async revokeDeviceSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const revoked = await administrationService.revokeDeviceSession(id, hospitalId);

      if (!revoked) {
        res.status(404).json({ success: false, message: 'Session not found or already revoked' });
        return;
      }

      res.status(200).json({ success: true, message: 'Device session successfully revoked' });
    } catch (error) {
      next(error);
    }
  }
}

export const administrationController = new AdministrationController();