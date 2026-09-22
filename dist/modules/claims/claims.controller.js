import { claimsService } from './claims.service.js';
const getAuthUser = (req) => {
    const user = req.user;
    if (!user?.hmoId) {
        throw new Error('Authenticated HMO context is missing');
    }
    return user;
};
export class ClaimsController {
    async createClaim(req, res, next) {
        try {
            const user = getAuthUser(req);
            const claim = await claimsService.createClaim(user.hmoId, req.body);
            res.status(201).json({ success: true, data: claim });
        }
        catch (error) {
            next(error);
        }
    }
    async getClaims(req, res, next) {
        try {
            const user = getAuthUser(req);
            const rawPage = Number.parseInt(String(req.query.page ?? '1'), 10);
            const rawLimit = Number.parseInt(String(req.query.limit ?? '20'), 10);
            const result = await claimsService.getClaims(user.hmoId, {
                page: Number.isFinite(rawPage) ? rawPage : 1,
                limit: Number.isFinite(rawLimit) ? rawLimit : 20,
                status: req.query.status,
                memberId: req.query.memberId,
                providerId: req.query.providerId,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                search: req.query.search,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getClaimById(req, res, next) {
        try {
            const user = getAuthUser(req);
            const claim = await claimsService.getClaimById(req.params.id, user.hmoId);
            if (!claim) {
                res.status(404).json({ success: false, message: 'Claim not found' });
                return;
            }
            res.status(200).json({ success: true, data: claim });
        }
        catch (error) {
            next(error);
        }
    }
    async updateClaimStatus(req, res, next) {
        try {
            const user = getAuthUser(req);
            const updated = await claimsService.updateClaimStatus(req.params.id, user.hmoId, user._id, req.body);
            if (!updated) {
                res.status(404).json({ success: false, message: 'Claim not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async getMemberClaims(req, res, next) {
        try {
            const user = getAuthUser(req);
            const claims = await claimsService.getMemberClaims(req.params.memberId, user.hmoId);
            res.status(200).json({ success: true, data: claims });
        }
        catch (error) {
            next(error);
        }
    }
}
export const claimsController = new ClaimsController();
