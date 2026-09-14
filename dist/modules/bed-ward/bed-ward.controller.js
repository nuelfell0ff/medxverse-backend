import { bedWardService } from './bed-ward.service.js';
import { occupancyForecastService } from './forecasting.service.js';
function hospitalId(req) {
    const id = req.user?.hospitalId || req.account?.accountId;
    if (!id)
        throw new Error('Hospital context missing.');
    return id;
}
function actorId(req) {
    const id = req.user?._id || req.account?.accountId;
    if (!id)
        throw new Error('Authenticated user context missing.');
    return id;
}
export class BedWardController {
    async createWard(req, res, next) {
        try {
            const value = await bedWardService.createWard({ ...req.body, hospitalId: hospitalId(req) });
            res.status(201).json({ success: true, ward: value });
        }
        catch (error) {
            next(error);
        }
    }
    async startWardCleaning(req, res, next) {
        try {
            const value = await bedWardService.startWardCleaning(req.params.id, hospitalId(req), actorId(req), req.body?.notes);
            res.json({ success: true, ward: value });
        }
        catch (error) {
            next(error);
        }
    }
    async completeWardCleaning(req, res, next) {
        try {
            const value = await bedWardService.completeWardCleaning(req.params.id, hospitalId(req), actorId(req), req.body?.notes);
            res.json({ success: true, ward: value });
        }
        catch (error) {
            next(error);
        }
    }
    async getWards(req, res, next) {
        try {
            res.json({ success: true, wards: await bedWardService.getWards(hospitalId(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    async createBed(req, res, next) {
        try {
            const value = await bedWardService.createBed({ ...req.body, hospitalId: hospitalId(req) });
            res.status(201).json({ success: true, bed: value });
        }
        catch (error) {
            next(error);
        }
    }
    async getBeds(req, res, next) {
        try {
            const result = await bedWardService.getBeds(hospitalId(req), {
                wardId: req.query.wardId,
                status: req.query.status,
                bedType: req.query.bedType,
                department: req.query.department,
                search: req.query.search,
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 50,
            });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async getBed(req, res, next) {
        try {
            res.json({ success: true, bed: await bedWardService.getBedById(req.params.id, hospitalId(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    async transitionBed(req, res, next) {
        try {
            const value = await bedWardService.transitionBed(req.params.id, hospitalId(req), {
                ...req.body,
                actorId: actorId(req),
            });
            res.json({ success: true, bed: value });
        }
        catch (error) {
            next(error);
        }
    }
    async completeCleaning(req, res, next) {
        try {
            const value = await bedWardService.completeCleaning(req.params.id, hospitalId(req), {
                ...req.body,
                actorId: actorId(req),
            });
            res.json({ success: true, bed: value });
        }
        catch (error) {
            next(error);
        }
    }
    async suggest(req, res, next) {
        try {
            const suggestions = await bedWardService.suggestBeds({
                ...req.body,
                hospitalId: hospitalId(req),
                requestedById: actorId(req),
            });
            res.json({ success: true, suggestions });
        }
        catch (error) {
            next(error);
        }
    }
    async confirmAssignment(req, res, next) {
        try {
            const assignment = await bedWardService.confirmAssignment({
                ...req.body,
                requestedById: actorId(req),
            }, hospitalId(req));
            res.status(201).json({ success: true, assignment });
        }
        catch (error) {
            next(error);
        }
    }
    async releaseAssignment(req, res, next) {
        try {
            const result = await bedWardService.releaseAssignment(req.params.id, hospitalId(req), actorId(req), req.body?.reason, req.body?.expectedVersion);
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async createTransfer(req, res, next) {
        try {
            const request = await bedWardService.createTransferRequest({
                ...req.body,
                hospitalId: hospitalId(req),
                requestedById: actorId(req),
            });
            res.status(201).json({ success: true, ...request });
        }
        catch (error) {
            next(error);
        }
    }
    async completeTransfer(req, res, next) {
        try {
            const result = await bedWardService.completeTransfer(req.params.id, hospitalId(req), actorId(req));
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async getTransfers(req, res, next) {
        try {
            res.json({
                success: true,
                requests: await bedWardService.getTransferRequests(hospitalId(req), req.query.status),
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getDashboard(req, res, next) {
        try {
            res.json({ success: true, dashboard: await bedWardService.getDashboard(hospitalId(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    async getHistory(req, res, next) {
        try {
            res.json({ success: true, events: await bedWardService.getStatusHistory(req.params.id, hospitalId(req), Number(req.query.limit) || 100) });
        }
        catch (error) {
            next(error);
        }
    }
    async generateForecast(req, res, next) {
        try {
            const forecasts = await occupancyForecastService.generate(hospitalId(req), Number(req.body?.horizonDays || req.query.horizonDays || 7), (req.body?.wardId || req.query.wardId));
            res.status(201).json({ success: true, forecasts });
        }
        catch (error) {
            next(error);
        }
    }
    async getForecast(req, res, next) {
        try {
            const forecasts = await bedWardService.getForecasts(hospitalId(req), req.query.wardId, Number(req.query.horizonDays) || 7);
            res.json({ success: true, forecasts });
        }
        catch (error) {
            next(error);
        }
    }
}
export const bedWardController = new BedWardController();
