import { hmoAnalyticsService } from './analytics.service.js';
const userOf = (req) => {
    return req.user;
};
const hmoOf = (req) => {
    const user = userOf(req);
    return (user?.hmoId ||
        user?.accountId ||
        user?.id ||
        user?._id);
};
const actorOf = (req) => {
    const user = userOf(req);
    return (user?.id ||
        user?._id ||
        user?.accountId);
};
export class HMOAnalyticsController {
    static async summary(req, res, next) {
        try {
            const hmoId = hmoOf(req);
            if (!hmoId) {
                return res.status(400).json({
                    success: false,
                    message: 'HMO ID not found in authentication context.',
                });
            }
            const data = await hmoAnalyticsService.summary(hmoId, req.query);
            return res.json({
                success: true,
                data,
            });
        }
        catch (error) {
            return next(error);
        }
    }
    static async report(req, res, next) {
        try {
            const hmoId = hmoOf(req);
            if (!hmoId) {
                return res.status(400).json({
                    success: false,
                    message: 'HMO ID not found in authentication context.',
                });
            }
            const data = await hmoAnalyticsService.generateReport(hmoId, actorOf(req), req.body);
            return res.status(201).json({
                success: true,
                data,
            });
        }
        catch (error) {
            return next(error);
        }
    }
    static async reports(req, res, next) {
        try {
            const hmoId = hmoOf(req);
            if (!hmoId) {
                return res.status(400).json({
                    success: false,
                    message: 'HMO ID not found in authentication context.',
                });
            }
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 12;
            const data = await hmoAnalyticsService.listReports(hmoId, page, limit);
            return res.json({
                success: true,
                data,
            });
        }
        catch (error) {
            return next(error);
        }
    }
    static async reportById(req, res, next) {
        try {
            const hmoId = hmoOf(req);
            if (!hmoId) {
                return res.status(400).json({
                    success: false,
                    message: 'HMO ID not found in authentication context.',
                });
            }
            const data = await hmoAnalyticsService.getReport(req.params.id, hmoId);
            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: 'Report not found.',
                });
            }
            return res.json({
                success: true,
                data,
            });
        }
        catch (error) {
            return next(error);
        }
    }
    static async audit(req, res, next) {
        try {
            const hmoId = hmoOf(req);
            if (!hmoId) {
                return res.status(400).json({
                    success: false,
                    message: 'HMO ID not found in authentication context.',
                });
            }
            const data = await hmoAnalyticsService.listAudit(hmoId, req.query);
            return res.json({
                success: true,
                data,
            });
        }
        catch (error) {
            return next(error);
        }
    }
    static async consents(req, res, next) {
        try {
            const hmoId = hmoOf(req);
            if (!hmoId) {
                return res.status(400).json({
                    success: false,
                    message: 'HMO ID not found in authentication context.',
                });
            }
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 15;
            const data = await hmoAnalyticsService.listConsents(hmoId, page, limit);
            return res.json({
                success: true,
                data,
            });
        }
        catch (error) {
            return next(error);
        }
    }
    static async grantConsent(req, res, next) {
        try {
            const hmoId = hmoOf(req);
            if (!hmoId) {
                return res.status(400).json({
                    success: false,
                    message: 'HMO ID not found in authentication context.',
                });
            }
            const data = await hmoAnalyticsService.upsertConsent(hmoId, req.body, actorOf(req));
            return res.status(201).json({
                success: true,
                data,
            });
        }
        catch (error) {
            return next(error);
        }
    }
    static async revokeConsent(req, res, next) {
        try {
            const hmoId = hmoOf(req);
            if (!hmoId) {
                return res.status(400).json({
                    success: false,
                    message: 'HMO ID not found in authentication context.',
                });
            }
            const data = await hmoAnalyticsService.revokeConsent(hmoId, req.params.id, actorOf(req));
            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: 'Consent record not found.',
                });
            }
            return res.json({
                success: true,
                data,
            });
        }
        catch (error) {
            return next(error);
        }
    }
    static async complianceGenerate(req, res, next) {
        try {
            const hmoId = hmoOf(req);
            if (!hmoId) {
                return res.status(400).json({
                    success: false,
                    message: 'HMO ID not found in authentication context.',
                });
            }
            const data = await hmoAnalyticsService.createComplianceReport(hmoId, actorOf(req), req.body);
            return res.status(201).json({
                success: true,
                data,
            });
        }
        catch (error) {
            return next(error);
        }
    }
    static async complianceList(req, res, next) {
        try {
            const hmoId = hmoOf(req);
            if (!hmoId) {
                return res.status(400).json({
                    success: false,
                    message: 'HMO ID not found in authentication context.',
                });
            }
            const data = await hmoAnalyticsService.listCompliance(hmoId, req.query);
            return res.json({
                success: true,
                data,
            });
        }
        catch (error) {
            return next(error);
        }
    }
    static async complianceStatus(req, res, next) {
        try {
            const hmoId = hmoOf(req);
            if (!hmoId) {
                return res.status(400).json({
                    success: false,
                    message: 'HMO ID not found in authentication context.',
                });
            }
            const data = await hmoAnalyticsService.updateComplianceStatus(hmoId, req.params.id, String(req.body.status), actorOf(req), req.body.notes);
            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: 'Compliance report not found.',
                });
            }
            return res.json({
                success: true,
                data,
            });
        }
        catch (error) {
            return next(error);
        }
    }
}
export default HMOAnalyticsController;
