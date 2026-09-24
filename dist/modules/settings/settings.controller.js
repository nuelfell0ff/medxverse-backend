import { hmoSettingsService } from './settings.service.js';
const getHmoId = (req) => {
    const authReq = req;
    const hmoId = authReq.user?.hmoId ??
        authReq.account?.hmoId ??
        (authReq.user?.accountType === 'HMO'
            ? authReq.user?.accountId
            : undefined) ??
        (authReq.account?.accountType === 'HMO'
            ? authReq.account?.accountId
            : undefined);
    if (!hmoId) {
        throw new Error('HMO context is required');
    }
    return String(hmoId);
};
const bodyData = (body) => {
    if (body &&
        typeof body === 'object' &&
        'data' in body) {
        return body.data;
    }
    return body;
};
export class HMOSettingsController {
    async get(req, res) {
        const settings = await hmoSettingsService.getSettings(getHmoId(req));
        return res.json({
            success: true,
            data: settings,
        });
    }
    async update(req, res) {
        const input = bodyData(req.body);
        if (!input ||
            typeof input !== 'object' ||
            Array.isArray(input)) {
            return res.status(400).json({
                success: false,
                message: 'A valid settings object is required',
            });
        }
        const settings = await hmoSettingsService.updateSettings(getHmoId(req), input);
        return res.json({
            success: true,
            data: settings,
            message: 'HMO settings updated successfully',
        });
    }
    async reset(req, res) {
        const settings = await hmoSettingsService.resetSettings(getHmoId(req));
        return res.json({
            success: true,
            data: settings,
            message: 'HMO settings reset successfully',
        });
    }
}
export const hmoSettingsController = new HMOSettingsController();
