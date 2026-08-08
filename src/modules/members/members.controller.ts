import { Request, Response, NextFunction } from 'express';
import { membersService } from './members.service.js';
import { MemberStatus, RelationshipType } from './members.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hmoId: string;
    [key: string]: unknown;
  };
}

export class MembersController {
  public async createMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;

      const member = await membersService.createMember(hmoId, req.body);
      res.status(201).json({ success: true, data: member });
    } catch (error) {
      next(error);
    }
  }

  public async getMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const status = req.query.status as MemberStatus | undefined;
      const benefitPlanId = req.query.benefitPlanId as string | undefined;
      const relationship = req.query.relationship as RelationshipType | undefined;
      const search = req.query.search as string | undefined;

      const result = await membersService.getMembers(hmoId, {
        page,
        limit,
        status,
        benefitPlanId,
        relationship,
        search,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async getMemberById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;
      const id = req.params.id as string;

      const member = await membersService.getMemberById(id, hmoId);
      if (!member) {
        res.status(404).json({ success: false, message: 'Member not found' });
        return;
      }

      res.status(200).json({ success: true, data: member });
    } catch (error) {
      next(error);
    }
  }

  public async updateMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;
      const id = req.params.id as string;

      const updated = await membersService.updateMember(id, hmoId, req.body);
      if (!updated) {
        res.status(404).json({ success: false, message: 'Member not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async updateMemberStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;
      const id = req.params.id as string;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({ success: false, message: 'Status is required' });
        return;
      }

      const updated = await membersService.updateMemberStatus(id, hmoId, status);
      if (!updated) {
        res.status(404).json({ success: false, message: 'Member not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async getDependents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;
      const id = req.params.id as string;

      const dependents = await membersService.getDependents(id, hmoId);
      res.status(200).json({ success: true, data: dependents });
    } catch (error) {
      next(error);
    }
  }
}

export const membersController = new MembersController();