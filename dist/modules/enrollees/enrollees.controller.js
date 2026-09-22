import { enrolleesService } from './enrollees.service.js';
const resolveHmoId = (req) => {
    const auth = req;
    const hmoId = auth.user?.hmoId ||
        auth.user?.accountId ||
        auth.account?.accountId;
    if (!hmoId) {
        throw Object.assign(new Error('Authenticated HMO account could not be resolved'), {
            statusCode: 401,
        });
    }
    return hmoId;
};
export class EnrolleesController {
    async createEnrollee(req, res, next) {
        try {
            const enrollee = await enrolleesService.createEnrollee(resolveHmoId(req), req.body);
            res.status(201).json({ success: true, data: enrollee });
        }
        catch (error) {
            next(error);
        }
    }
    async getEnrollees(req, res, next) {
        try {
            const page = req.query.page ? Number.parseInt(String(req.query.page), 10) : 1;
            const limit = req.query.limit ? Number.parseInt(String(req.query.limit), 10) : 20;
            const result = await enrolleesService.getEnrollees(resolveHmoId(req), {
                page,
                limit,
                status: req.query.status,
                benefitPlanId: req.query.benefitPlanId,
                relationship: req.query.relationship,
                search: req.query.search,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getStats(req, res, next) {
        try {
            const stats = await enrolleesService.getStats(resolveHmoId(req));
            res.status(200).json({ success: true, data: stats });
        }
        catch (error) {
            next(error);
        }
    }
    async getEnrolleeById(req, res, next) {
        try {
            const enrollee = await enrolleesService.getEnrolleeById(String(req.params.id), resolveHmoId(req));
            if (!enrollee) {
                res.status(404).json({ success: false, message: 'Enrollee not found' });
                return;
            }
            res.status(200).json({ success: true, data: enrollee });
        }
        catch (error) {
            next(error);
        }
    }
    async updateEnrollee(req, res, next) {
        try {
            const updated = await enrolleesService.updateEnrollee(String(req.params.id), resolveHmoId(req), req.body);
            if (!updated) {
                res.status(404).json({ success: false, message: 'Enrollee not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async updateStatus(req, res, next) {
        try {
            const status = req.body?.status;
            if (!status) {
                res.status(400).json({ success: false, message: 'Status is required' });
                return;
            }
            const updated = await enrolleesService.updateEnrolleeStatus(String(req.params.id), resolveHmoId(req), status);
            if (!updated) {
                res.status(404).json({ success: false, message: 'Enrollee not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async getDependents(req, res, next) {
        try {
            const dependents = await enrolleesService.getDependents(String(req.params.id), resolveHmoId(req));
            res.status(200).json({ success: true, data: dependents });
        }
        catch (error) {
            next(error);
        }
    }
    async checkEligibility(req, res, next) {
        try {
            const eligibility = await enrolleesService.checkEligibility(String(req.params.id), resolveHmoId(req), req.query.date ? new Date(String(req.query.date)) : new Date());
            res.status(200).json({ success: true, data: eligibility });
        }
        catch (error) {
            next(error);
        }
    }
}
export const enrolleesController = new EnrolleesController();
