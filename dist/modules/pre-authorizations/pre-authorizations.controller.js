import { preAuthorizationsService } from './pre-authorizations.service.js';
export class PreAuthorizationsController {
    async createPreAuth(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const preAuth = await preAuthorizationsService.createPreAuth({
                ...req.body,
                hmoId,
            });
            res.status(201).json({ success: true, data: preAuth });
        }
        catch (error) {
            next(error);
        }
    }
    async getPreAuths(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const status = req.query.status;
            const priority = req.query.priority;
            const memberId = req.query.memberId;
            const providerId = req.query.providerId;
            const search = req.query.search;
            const result = await preAuthorizationsService.getPreAuths(hmoId, {
                page,
                limit,
                status,
                priority,
                memberId,
                providerId,
                search,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getPreAuthById(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const id = req.params.id;
            const preAuth = await preAuthorizationsService.getPreAuthById(id, hmoId);
            if (!preAuth) {
                res.status(404).json({ success: false, message: 'Pre-authorization request not found' });
                return;
            }
            res.status(200).json({ success: true, data: preAuth });
        }
        catch (error) {
            next(error);
        }
    }
    async reviewPreAuth(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const reviewerId = authReq.user._id;
            const id = req.params.id;
            const updated = await preAuthorizationsService.reviewPreAuth(id, hmoId, reviewerId, req.body);
            if (!updated) {
                res.status(404).json({ success: false, message: 'Pre-authorization request not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async getPreAuthStats(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const stats = await preAuthorizationsService.getPreAuthStats(hmoId);
            res.status(200).json({ success: true, data: stats });
        }
        catch (error) {
            next(error);
        }
    }
}
export const preAuthorizationsController = new PreAuthorizationsController();
