import { ReportsService } from './reports.service.js';
export class ReportsController {
    static async getExecutiveSummary(req, res, next) {
        try {
            const hospitalId = req.user.hospitalId;
            const summary = await ReportsService.getExecutiveSummary(hospitalId);
            res.status(200).json({
                success: true,
                data: summary,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getRevenueReport(req, res, next) {
        try {
            const hospitalId = req.user.hospitalId;
            const filters = req.query;
            const report = await ReportsService.getRevenueReport(hospitalId, filters);
            res.status(200).json({
                success: true,
                data: report,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getBedOccupancyReport(req, res, next) {
        try {
            const hospitalId = req.user.hospitalId;
            const report = await ReportsService.getBedOccupancyReport(hospitalId);
            res.status(200).json({
                success: true,
                data: report,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getPatientDemographics(req, res, next) {
        try {
            const hospitalId = req.user.hospitalId;
            const report = await ReportsService.getPatientDemographics(hospitalId);
            res.status(200).json({
                success: true,
                data: report,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async createSavedReport(req, res, next) {
        try {
            const hospitalId = req.user.hospitalId;
            const userId = req.user._id;
            const report = await ReportsService.createSavedReport(hospitalId, userId, req.body);
            res.status(201).json({
                success: true,
                message: 'Report snapshot saved successfully',
                data: report,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getSavedReports(req, res, next) {
        try {
            const hospitalId = req.user.hospitalId;
            const filters = req.query;
            const result = await ReportsService.getSavedReports(hospitalId, filters);
            res.status(200).json({
                success: true,
                data: result.reports,
                pagination: result.pagination,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
