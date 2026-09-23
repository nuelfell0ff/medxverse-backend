import { Request, Response, NextFunction } from 'express';
import { eligibilityService } from './eligibility.service.js';
import { EligibilityDecision, EligibilityServiceCategory } from './eligibility.types.js';

interface AuthContext {
  account?: { accountId?: string; accountType?: string };
  user?: { hmoId?: string; accountId?: string; accountType?: string; [key: string]: unknown };
}
const resolveHmoId = (req: Request): string => {
  const auth = req as Request & AuthContext;
  const hmoId = auth.user?.hmoId || auth.user?.accountId || auth.account?.accountId;
  if (!hmoId) throw Object.assign(new Error('Authenticated HMO account could not be resolved'), { statusCode: 401 });
  return hmoId;
};

export class EligibilityController {
  public async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ success: true, data: await eligibilityService.verify(resolveHmoId(req), req.body) }); }
    catch (error) { next(error); }
  }
  public async getChecks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: await eligibilityService.getChecks(resolveHmoId(req), {
        page: req.query.page as string | undefined,
        limit: req.query.limit as string | undefined,
        decision: req.query.decision as EligibilityDecision | undefined,
        serviceCategory: req.query.serviceCategory as EligibilityServiceCategory | undefined,
        memberId: req.query.memberId as string | undefined,
        providerId: req.query.providerId as string | undefined,
        search: req.query.search as string | undefined,
      }) });
    } catch (error) { next(error); }
  }
  public async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ success: true, data: await eligibilityService.getStats(resolveHmoId(req)) }); }
    catch (error) { next(error); }
  }
  public async getCheckById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await eligibilityService.getCheckById(String(req.params.id), resolveHmoId(req));
      if (!data) { res.status(404).json({ success: false, message: 'Eligibility check not found' }); return; }
      res.status(200).json({ success: true, data });
    } catch (error) { next(error); }
  }
  public async getMemberChecks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.status(200).json({ success: true, data: await eligibilityService.getMemberChecks(String(req.params.memberId), resolveHmoId(req)) }); }
    catch (error) { next(error); }
  }
}
export const eligibilityController = new EligibilityController();
