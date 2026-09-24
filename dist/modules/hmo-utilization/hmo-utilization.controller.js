import { HMOUtilizationService } from './hmo-utilization.service.js';
const service = new HMOUtilizationService();
/**
 * HMO tenant resolution
 *
 * HMO utilization data is always scoped to the authenticated HMO.
 * Do not trust a client-supplied hmoId query parameter for tenant
 * selection because that would allow cross-HMO access.
 *
 * The auth middleware used elsewhere in MedXVerse can expose the
 * tenant through different fields depending on account/version, so
 * we support the known HMO/organization/account identity fields.
 */
const getHmoId = (req) => {
    const authReq = req;
    const user = authReq.user;
    const value = user?.hmoId ||
        user?.organizationId ||
        user?.accountId ||
        user?.id ||
        user?._id ||
        user?.userId;
    if (!value || typeof value !== 'string') {
        const err = new Error('HMO ID not found in authentication context.');
        err.statusCode = 400;
        throw err;
    }
    return value;
};
const getUserId = (req) => {
    const user = req.user;
    const value = user?.id || user?._id || user?.userId || user?.accountId;
    return value ? String(value) : undefined;
};
const sendError = (res, err) => {
    const status = Number(err?.statusCode) || 400;
    return res
        .status(status)
        .json({
        success: false,
        message: err?.message || 'Request failed',
    });
};
export class HMOUtilizationController {
    async summary(req, res) {
        try {
            return res.json({
                success: true,
                data: await service.getSummary(getHmoId(req)),
            });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    async events(req, res) {
        try {
            return res.json({
                success: true,
                data: await service.getUtilizationEvents(getHmoId(req), req.query),
            });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    async createEvent(req, res) {
        try {
            return res.status(201).json({
                success: true,
                data: await service.createUtilizationEvent(getHmoId(req), req.body),
            });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    async rules(req, res) {
        try {
            return res.json({
                success: true,
                data: await service.getRules(getHmoId(req)),
            });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    async createRule(req, res) {
        try {
            return res.status(201).json({
                success: true,
                data: await service.createRule(getHmoId(req), req.body),
            });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    async updateRule(req, res) {
        try {
            return res.json({
                success: true,
                data: await service.updateRule(getHmoId(req), req.params.id, req.body),
            });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    async runRules(req, res) {
        try {
            return res.json({
                success: true,
                data: await service.runRules(getHmoId(req)),
            });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    async alerts(req, res) {
        try {
            return res.json({
                success: true,
                data: await service.getAlerts(getHmoId(req), req.query),
            });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    async reviewAlert(req, res) {
        try {
            return res.json({
                success: true,
                data: await service.reviewAlert(getHmoId(req), req.params.id, req.body, getUserId(req)),
            });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    async cases(req, res) {
        try {
            return res.json({
                success: true,
                data: await service.getCases(getHmoId(req), req.query),
            });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    async createCase(req, res) {
        try {
            return res.status(201).json({
                success: true,
                data: await service.createCase(getHmoId(req), req.body),
            });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    async updateCase(req, res) {
        try {
            return res.json({
                success: true,
                data: await service.updateCase(getHmoId(req), req.params.id, req.body),
            });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
}
