import { DashboardService } from './dashboard.service.js';
export class DashboardController {
    static async getMetrics(req, res, next) {
        try {
            const user = req.user;
            const hospitalId = user.hospitalId || user.id;
            const metrics = await DashboardService.getExecutiveMetrics(hospitalId);
            res.status(200).json({
                success: true,
                data: metrics,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
