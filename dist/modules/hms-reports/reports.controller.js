import { reportsService } from './reports.service.js';
export class ReportsController {
    async generateReport(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const userId = authReq.user._id;
            const report = await reportsService.generateReport(hmoId, userId, req.body);
            res.status(201).json({ success: true, data: report });
        }
        catch (error) {
            next(error);
        }
    }
    async getReportHistory(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const type = req.query.type;
            const status = req.query.status;
            const result = await reportsService.getReportHistory(hmoId, {
                page,
                limit,
                type,
                status,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getReportById(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const id = req.params.id;
            const report = await reportsService.getReportById(id, hmoId);
            if (!report) {
                res.status(404).json({ success: false, message: 'Report not found' });
                return;
            }
            res.status(200).json({ success: true, data: report });
        }
        catch (error) {
            next(error);
        }
    }
}
export const reportsController = new ReportsController();
