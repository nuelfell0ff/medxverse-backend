import { eligibilityService } from './eligibility.service.js';
const resolveHmoId = (req) => {
    const auth = req;
    const hmoId = auth.user?.hmoId || auth.user?.accountId || auth.account?.accountId;
    if (!hmoId)
        throw Object.assign(new Error('Authenticated HMO account could not be resolved'), { statusCode: 401 });
    return hmoId;
};
export class EligibilityController {
    async verify(req, res, next) {
        try {
            res.status(200).json({ success: true, data: await eligibilityService.verify(resolveHmoId(req), req.body) });
        }
        catch (error) {
            next(error);
        }
    }
    async getChecks(req, res, next) {
        try {
            res.status(200).json({ success: true, data: await eligibilityService.getChecks(resolveHmoId(req), {
                    page: req.query.page,
                    limit: req.query.limit,
                    decision: req.query.decision,
                    serviceCategory: req.query.serviceCategory,
                    memberId: req.query.memberId,
                    providerId: req.query.providerId,
                    search: req.query.search,
                }) });
        }
        catch (error) {
            next(error);
        }
    }
    async getStats(req, res, next) {
        try {
            res.status(200).json({ success: true, data: await eligibilityService.getStats(resolveHmoId(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    async getCheckById(req, res, next) {
        try {
            const data = await eligibilityService.getCheckById(String(req.params.id), resolveHmoId(req));
            if (!data) {
                res.status(404).json({ success: false, message: 'Eligibility check not found' });
                return;
            }
            res.status(200).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    async getMemberChecks(req, res, next) {
        try {
            res.status(200).json({ success: true, data: await eligibilityService.getMemberChecks(String(req.params.memberId), resolveHmoId(req)) });
        }
        catch (error) {
            next(error);
        }
    }
}
export const eligibilityController = new EligibilityController();
