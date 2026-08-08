import { benefitsService } from './benefits.service.js';
export class BenefitsController {
    async createPackage(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const pkg = await benefitsService.createPackage(hmoId, req.body);
            res.status(201).json({ success: true, data: pkg });
        }
        catch (error) {
            next(error);
        }
    }
    async getPackages(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const status = req.query.status;
            const tier = req.query.tier;
            const search = req.query.search;
            const result = await benefitsService.getPackages(hmoId, {
                page,
                limit,
                status,
                tier,
                search,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getPackageById(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const id = req.params.id;
            const pkg = await benefitsService.getPackageById(id, hmoId);
            if (!pkg) {
                res.status(404).json({ success: false, message: 'Benefit package not found' });
                return;
            }
            res.status(200).json({ success: true, data: pkg });
        }
        catch (error) {
            next(error);
        }
    }
    async updatePackage(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const id = req.params.id;
            const updated = await benefitsService.updatePackage(id, hmoId, req.body);
            if (!updated) {
                res.status(404).json({ success: false, message: 'Benefit package not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
}
export const benefitsController = new BenefitsController();
