import { Request, Response, NextFunction } from 'express';
import { membersService } from './members.service.js';
import { MemberStatus, RelationshipType } from './members.types.js';

interface AuthContext {
  account?: {
    accountId?: string;
    accountType?: string;
  };
  user?: {
    _id?: string;
    accountId?: string;
    hmoId?: string;
    accountType?: string;
    [key: string]: unknown;
  };
}

const resolveHmoId = (req: Request): string => {
  const auth = req as Request & AuthContext;
  const hmoId =
    auth.user?.hmoId ||
    auth.user?.accountId ||
    auth.account?.accountId;

  if (!hmoId) {
    throw Object.assign(
      new Error('Authenticated HMO account could not be resolved'),
      { statusCode: 401 },
    );
  }

  return hmoId;
};

const resolveActorId = (req: Request): string | undefined => {
  const auth = req as Request & AuthContext;
  return auth.user?._id;
};

export class MembersController {
  /**
   * Legacy /members creation endpoint.
   * Delegates to Enrollee Registry so member creation also records lifecycle
   * history and issues/updates the digital HMO card.
   */
  public async createMember(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const member = await membersService.createMember(
        resolveHmoId(req),
        req.body,
        resolveActorId(req),
      );

      res.status(201).json({ success: true, data: member });
    } catch (error) {
      next(error);
    }
  }

  public async getMembers(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const page = req.query.page
        ? Number.parseInt(String(req.query.page), 10)
        : 1;
      const limit = req.query.limit
        ? Number.parseInt(String(req.query.limit), 10)
        : 20;

      const result = await membersService.getMembers(
        resolveHmoId(req),
        {
          page,
          limit,
          status: req.query.status as MemberStatus | undefined,
          benefitPlanId: req.query.benefitPlanId as string | undefined,
          relationship: req.query.relationship as RelationshipType | undefined,
          search: req.query.search as string | undefined,
        },
      );

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async getMemberById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const member = await membersService.getMemberById(
        String(req.params.id),
        resolveHmoId(req),
      );

      if (!member) {
        res.status(404).json({
          success: false,
          message: 'Member not found',
        });
        return;
      }

      res.status(200).json({ success: true, data: member });
    } catch (error) {
      next(error);
    }
  }

  public async updateMember(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const updated = await membersService.updateMember(
        String(req.params.id),
        resolveHmoId(req),
        req.body,
        resolveActorId(req),
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Member not found',
        });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async updateMemberStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const status = req.body?.status as MemberStatus | undefined;

      if (!status) {
        res.status(400).json({
          success: false,
          message: 'Status is required',
        });
        return;
      }

      const updated = await membersService.updateMemberStatus(
        String(req.params.id),
        resolveHmoId(req),
        status,
        req.body?.reason,
        resolveActorId(req),
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Member not found',
        });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async getDependents(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const dependents = await membersService.getDependents(
        String(req.params.id),
        resolveHmoId(req),
      );

      res.status(200).json({ success: true, data: dependents });
    } catch (error) {
      next(error);
    }
  }

  public async checkEligibility(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const eligibility = await membersService.checkEligibility(
        String(req.params.id),
        resolveHmoId(req),
        req.query.date
          ? new Date(String(req.query.date))
          : new Date(),
      );

      res.status(200).json({ success: true, data: eligibility });
    } catch (error) {
      next(error);
    }
  }

  public async renewMember(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const updated = await membersService.renewMember(
        String(req.params.id),
        resolveHmoId(req),
        req.body,
        resolveActorId(req),
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Member not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updated,
        message: 'Member renewed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  public async getCard(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const card = await membersService.getCard(
        String(req.params.id),
        resolveHmoId(req),
        resolveActorId(req),
      );

      if (!card) {
        res.status(404).json({
          success: false,
          message: 'Member not found',
        });
        return;
      }

      res.status(200).json({ success: true, data: card });
    } catch (error) {
      next(error);
    }
  }

  public async getLifecycle(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const events = await membersService.getLifecycle(
        String(req.params.id),
        resolveHmoId(req),
      );

      res.status(200).json({ success: true, data: events });
    } catch (error) {
      next(error);
    }
  }
}

export const membersController = new MembersController();
