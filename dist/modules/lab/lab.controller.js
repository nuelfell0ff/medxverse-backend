import { LabService } from './lab.service.js';
/* =========================================================
   CONTROLLER
========================================================= */
export class LabController {
    static getAuthContext(req) {
        const authReq = req;
        const userId = authReq.user?._id ||
            authReq.user?.accountId ||
            authReq.account?.accountId;
        const hospitalId = authReq.user?.hospitalId ||
            authReq.user?.accountId ||
            authReq.account?.accountId;
        if (!userId || !hospitalId) {
            const error = new Error('Authentication context is missing.');
            error.statusCode = 401;
            throw error;
        }
        return {
            userId,
            hospitalId,
        };
    }
    /* =========================================================
       CREATE
    ========================================================= */
    static async create(req, res, next) {
        try {
            const { userId, hospitalId, } = LabController.getAuthContext(req);
            const order = await LabService.createOrder(hospitalId, userId, req.body);
            res.status(201).json({
                success: true,
                data: order,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /* =========================================================
       LIST / WORKLIST
    ========================================================= */
    static async list(req, res, next) {
        try {
            const { hospitalId, } = LabController.getAuthContext(req);
            const result = await LabService.getOrders(hospitalId, req.query);
            res.status(200).json({
                success: true,
                ...result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /* =========================================================
       GET BY ID
    ========================================================= */
    static async getById(req, res, next) {
        try {
            const { hospitalId, } = LabController.getAuthContext(req);
            const order = await LabService.getOrderById(hospitalId, req.params.id);
            res.status(200).json({
                success: true,
                data: order,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /* =========================================================
       COLLECT SAMPLE
    ========================================================= */
    static async collectSample(req, res, next) {
        try {
            const { userId, hospitalId, } = LabController.getAuthContext(req);
            const updated = await LabService.collectSample(hospitalId, req.params.id, userId);
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /* =========================================================
       ACCESSION SPECIMEN
    ========================================================= */
    static async accessionSpecimen(req, res, next) {
        try {
            const { userId, hospitalId, } = LabController.getAuthContext(req);
            const updated = await LabService.accessionSpecimen(hospitalId, req.params.id, userId, req.body || {});
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /* =========================================================
       REJECT SAMPLE
    ========================================================= */
    static async rejectSample(req, res, next) {
        try {
            const { userId, hospitalId, } = LabController.getAuthContext(req);
            const updated = await LabService.rejectSample(hospitalId, req.params.id, userId, req.body);
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /* =========================================================
       RECOLLECT SAMPLE
    ========================================================= */
    static async recollectSample(req, res, next) {
        try {
            const { userId, hospitalId, } = LabController.getAuthContext(req);
            const updated = await LabService.recollectSample(hospitalId, req.params.id, userId);
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /* =========================================================
       PRICING CATALOGUES
    ========================================================= */
    static async pricingCatalogues(req, res, next) {
        try {
            const { hospitalId } = LabController.getAuthContext(req);
            const items = await LabService.getPricingCatalogues(hospitalId, typeof req.query.testName === 'string' ? req.query.testName : undefined);
            res.status(200).json({
                success: true,
                data: items,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /* =========================================================
       BILLING
    ========================================================= */
    static async captureBilling(req, res, next) {
        try {
            const { userId, hospitalId } = LabController.getAuthContext(req);
            const updated = await LabService.captureBilling(hospitalId, req.params.id, userId);
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /* =========================================================
       RECORD RESULTS
    ========================================================= */
    static async submitResults(req, res, next) {
        try {
            const { userId, hospitalId, } = LabController.getAuthContext(req);
            const updated = await LabService.recordResults(hospitalId, req.params.id, userId, req.body);
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /* =========================================================
       VERIFY RESULTS
    ========================================================= */
    static async verifyResults(req, res, next) {
        try {
            const { userId, hospitalId, } = LabController.getAuthContext(req);
            const updated = await LabService.verifyResults(hospitalId, req.params.id, userId);
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /* =========================================================
       AUTHORIZE RESULTS
    ========================================================= */
    static async authorizeResults(req, res, next) {
        try {
            const { userId, hospitalId, } = LabController.getAuthContext(req);
            const updated = await LabService.authorizeResults(hospitalId, req.params.id, userId);
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /* =========================================================
       AMEND RESULTS
    ========================================================= */
    static async amendResults(req, res, next) {
        try {
            const { userId, hospitalId, } = LabController.getAuthContext(req);
            const updated = await LabService.amendResults(hospitalId, req.params.id, userId, req.body);
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /* =========================================================
       REPEAT TEST
    ========================================================= */
    static async repeatTest(req, res, next) {
        try {
            const { userId, hospitalId, } = LabController.getAuthContext(req);
            const updated = await LabService.repeatTest(hospitalId, req.params.id, userId, req.body);
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
