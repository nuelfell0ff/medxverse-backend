import { preAuthorizationsService } from './pre-authorizations.service.js';
export class PreAuthorizationsController {
    async createPreAuth(req, res, next) {
        try {
            const authReq = req;
            const preAuth = await preAuthorizationsService.createPreAuth({
                ...req.body,
                hmoId: authReq.user.hmoId,
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
            const result = await preAuthorizationsService.getPreAuths(authReq.user.hmoId, {
                page: req.query.page ? parseInt(String(req.query.page), 10) : 1,
                limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 20,
                status: req.query.status,
                priority: req.query.priority,
                memberId: req.query.memberId,
                providerId: req.query.providerId,
                search: req.query.search,
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
            const preAuth = await preAuthorizationsService.getPreAuthById(req.params.id, authReq.user.hmoId);
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
            const updated = await preAuthorizationsService.reviewPreAuth(req.params.id, authReq.user.hmoId, authReq.user._id, req.body);
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
            const stats = await preAuthorizationsService.getPreAuthStats(authReq.user.hmoId);
            res.status(200).json({ success: true, data: stats });
        }
        catch (error) {
            next(error);
        }
    }
}
export const preAuthorizationsController = new PreAuthorizationsController();
