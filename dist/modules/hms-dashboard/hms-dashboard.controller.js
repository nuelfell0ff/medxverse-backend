import { hmsDashboardService } from './hms-dashboard.service.js';
export class HmsDashboardController {
    async getDashboardMetrics(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId || req.query.hmoId;
            const metrics = await hmsDashboardService.getDashboardMetrics(hmoId);
            res.status(200).json({
                success: true,
                data: metrics,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getDashboardSettings(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const settings = await hmsDashboardService.getDashboardSettings(hmoId);
            res.status(200).json({
                success: true,
                data: settings,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateDashboardSettings(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const updated = await hmsDashboardService.updateDashboardSettings(hmoId, req.body);
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
export const hmsDashboardController = new HmsDashboardController();
