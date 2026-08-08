import { HmoService } from './hmo.service.js';
export class HmoController {
    static async verifyEligibility(req, res, next) {
        try {
            const hospitalId = req.user.hospitalId;
            const { policyNumber, hmoId } = req.body;
            const result = await HmoService.verifyEligibility(hospitalId, policyNumber, hmoId);
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async requestPreAuthorization(req, res, next) {
        try {
            const hospitalId = req.user.hospitalId;
            const preAuth = await HmoService.requestPreAuthorization(hospitalId, req.body);
            res.status(201).json({ success: true, data: preAuth });
        }
        catch (error) {
            next(error);
        }
    }
    static async submitClaim(req, res, next) {
        try {
            const hospitalId = req.user.hospitalId;
            const claim = await HmoService.submitClaim(hospitalId, req.body);
            res.status(201).json({ success: true, data: claim });
        }
        catch (error) {
            next(error);
        }
    }
    static async getClaims(req, res, next) {
        try {
            const hospitalId = req.user.hospitalId;
            const filters = {
                status: req.query.status,
                patientId: req.query.patientId,
                page: req.query.page ? parseInt(req.query.page, 10) : undefined,
                limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
            };
            const result = await HmoService.getClaims(hospitalId, filters);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getClaimById(req, res, next) {
        try {
            const hospitalId = req.user.hospitalId;
            const claim = await HmoService.getClaimById(req.params.id, hospitalId);
            res.status(200).json({ success: true, data: claim });
        }
        catch (error) {
            next(error);
        }
    }
}
