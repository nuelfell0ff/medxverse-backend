import { claimsService } from './claims.service.js';
export class ClaimsController {
    async createClaim(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const claim = await claimsService.createClaim(hmoId, req.body);
            res.status(201).json({ success: true, data: claim });
        }
        catch (error) {
            next(error);
        }
    }
    async getClaims(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const status = req.query.status;
            const memberId = req.query.memberId;
            const providerId = req.query.providerId;
            const startDate = req.query.startDate;
            const endDate = req.query.endDate;
            const search = req.query.search;
            const result = await claimsService.getClaims(hmoId, {
                page,
                limit,
                status,
                memberId,
                providerId,
                startDate,
                endDate,
                search,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getClaimById(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const id = req.params.id;
            const claim = await claimsService.getClaimById(id, hmoId);
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
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const userId = authReq.user._id;
            const id = req.params.id;
            const updated = await claimsService.updateClaimStatus(id, hmoId, userId, req.body);
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
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const memberId = req.params.memberId;
            const claims = await claimsService.getMemberClaims(memberId, hmoId);
            res.status(200).json({ success: true, data: claims });
        }
        catch (error) {
            next(error);
        }
    }
}
export const claimsController = new ClaimsController();
