import { settingsService } from './settings.service.js';
export class SettingsController {
    async upsertSettings(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const updatedById = authReq.user._id;
            const { profile, branding, defaultLanguage, timeZone, currency, theme } = req.body;
            const settings = await settingsService.upsertSettings({
                hospitalId,
                profile,
                branding,
                defaultLanguage,
                timeZone,
                currency,
                theme: theme,
                updatedById,
            });
            res.status(200).json({ success: true, data: settings });
        }
        catch (error) {
            next(error);
        }
    }
    async getSettings(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const settings = await settingsService.getSettings(hospitalId);
            res.status(200).json({ success: true, data: settings });
        }
        catch (error) {
            next(error);
        }
    }
    async createClinicalTemplate(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const createdById = authReq.user._id;
            const { title, category, departmentId, content } = req.body;
            const template = await settingsService.createClinicalTemplate({
                hospitalId,
                title,
                category,
                departmentId,
                content,
                createdById,
            });
            res.status(201).json({ success: true, data: template });
        }
        catch (error) {
            next(error);
        }
    }
    async getClinicalTemplates(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const category = req.query.category;
            const templates = await settingsService.getClinicalTemplates(hospitalId, category);
            res.status(200).json({ success: true, data: templates });
        }
        catch (error) {
            next(error);
        }
    }
    async createIntegration(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const { name, type, apiKey, apiSecret, baseUrl, configOptions } = req.body;
            const integration = await settingsService.createIntegration({
                hospitalId,
                name,
                type: type,
                apiKey,
                apiSecret,
                baseUrl,
                configOptions,
            });
            res.status(201).json({ success: true, data: integration });
        }
        catch (error) {
            next(error);
        }
    }
    async getIntegrations(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const integrations = await settingsService.getIntegrations(hospitalId);
            res.status(200).json({ success: true, data: integrations });
        }
        catch (error) {
            next(error);
        }
    }
}
export const settingsController = new SettingsController();
