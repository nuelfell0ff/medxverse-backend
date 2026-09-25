import { hmoAnalyticsService } from './analytics.service.js';
const userOf = (req) => req.user;
const hmoOf = (req) => userOf(req)?.hmoId || userOf(req)?.accountId || userOf(req)?.id || userOf(req)?._id;
const actorOf = (req) => userOf(req)?.id || userOf(req)?._id || userOf(req)?.accountId;
export class HMOAnalyticsController {
    static async summary(req, res, next) { try {
        const hmoId = hmoOf(req);
        if (!hmoId)
            return res.status(400).json({ success: false, message: 'HMO ID not found in authentication context.' });
        const data = await hmoAnalyticsService.summary(hmoId, req.query);
        res.json({ success: true, data });
    }
    catch (e) {
        next(e);
    } }
    static async report(req, res, next) { try {
        const hmoId = hmoOf(req);
        if (!hmoId)
            return res.status(400).json({ success: false, message: 'HMO ID not found in authentication context.' });
        const data = await hmoAnalyticsService.generateReport(hmoId, actorOf(req), req.body);
        res.status(201).json({ success: true, data });
    }
    catch (e) {
        next(e);
    } }
    static async reports(req, res, next) { try {
        const hmoId = hmoOf(req);
        if (!hmoId)
            return res.status(400).json({ success: false, message: 'HMO ID not found in authentication context.' });
        res.json({ success: true, data: await hmoAnalyticsService.listReports(hmoId, Number(req.query.page), Number(req.query.limit)) });
    }
    catch (e) {
        next(e);
    } }
    static async reportById(req, res, next) { try {
        const hmoId = hmoOf(req);
        if (!hmoId)
            return res.status(400).json({ success: false, message: 'HMO ID not found in authentication context.' });
        const data = await hmoAnalyticsService.getReport(req.params.id, hmoId);
        if (!data)
            return res.status(404).json({ success: false, message: 'Report not found.' });
        res.json({ success: true, data });
    }
    catch (e) {
        next(e);
    } }
    static async audit(req, res, next) { try {
        const hmoId = hmoOf(req);
        if (!hmoId)
            return res.status(400).json({ success: false, message: 'HMO ID not found in authentication context.' });
        res.json({ success: true, data: await hmoAnalyticsService.listAudit(hmoId, req.query) });
    }
    catch (e) {
        next(e);
    } }
    static async consents(req, res, next) { try {
        const hmoId = hmoOf(req);
        if (!hmoId)
            return res.status(400).json({ success: false, message: 'HMO ID not found in authentication context.' });
        res.json({ success: true, data: await hmoAnalyticsService.listConsents(hmoId, Number(req.query.page), Number(req.query.limit)) });
    }
    catch (e) {
        next(e);
    } }
    static async grantConsent(req, res, next) { try {
        const hmoId = hmoOf(req);
        if (!hmoId)
            return res.status(400).json({ success: false, message: 'HMO ID not found in authentication context.' });
        res.status(201).json({ success: true, data: await hmoAnalyticsService.upsertConsent(hmoId, req.body, actorOf(req)) });
    }
    catch (e) {
        next(e);
    } }
    static async revokeConsent(req, res, next) { try {
        const hmoId = hmoOf(req);
        if (!hmoId)
            return res.status(400).json({ success: false, message: 'HMO ID not found in authentication context.' });
        const data = await hmoAnalyticsService.revokeConsent(hmoId, req.params.id, actorOf(req));
        if (!data)
            return res.status(404).json({ success: false, message: 'Consent record not found.' });
        res.json({ success: true, data });
    }
    catch (e) {
        next(e);
    } }
    static async complianceGenerate(req, res, next) { try {
        const hmoId = hmoOf(req);
        if (!hmoId)
            return res.status(400).json({ success: false, message: 'HMO ID not found in authentication context.' });
        res.status(201).json({ success: true, data: await hmoAnalyticsService.createComplianceReport(hmoId, actorOf(req), req.body) });
    }
    catch (e) {
        next(e);
    } }
    static async complianceList(req, res, next) { try {
        const hmoId = hmoOf(req);
        if (!hmoId)
            return res.status(400).json({ success: false, message: 'HMO ID not found in authentication context.' });
        res.json({ success: true, data: await hmoAnalyticsService.listCompliance(hmoId, req.query) });
    }
    catch (e) {
        next(e);
    } }
    static async complianceStatus(req, res, next) { try {
        const hmoId = hmoOf(req);
        if (!hmoId)
            return res.status(400).json({ success: false, message: 'HMO ID not found in authentication context.' });
        const data = await hmoAnalyticsService.updateComplianceStatus(hmoId, req.params.id, String(req.body.status), actorOf(req), req.body.notes);
        if (!data)
            return res.status(404).json({ success: false, message: 'Compliance report not found.' });
        res.json({ success: true, data });
    }
    catch (e) {
        next(e);
    } }
}
