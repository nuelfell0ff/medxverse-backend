import { providerService } from './provider.service.js';
export class ProviderController {
    async createProvider(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const provider = await providerService.createProvider(hmoId, req.body);
            res.status(201).json({ success: true, data: provider });
        }
        catch (error) {
            next(error);
        }
    }
    async getProviders(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const status = req.query.status;
            const type = req.query.type;
            const state = req.query.state;
            const search = req.query.search;
            const result = await providerService.getProviders(hmoId, {
                page,
                limit,
                status,
                type,
                state,
                search,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getProviderById(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const id = req.params.id;
            const provider = await providerService.getProviderById(id, hmoId);
            if (!provider) {
                res.status(404).json({ success: false, message: 'Provider not found' });
                return;
            }
            res.status(200).json({ success: true, data: provider });
        }
        catch (error) {
            next(error);
        }
    }
    async updateProvider(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const id = req.params.id;
            const updated = await providerService.updateProvider(id, hmoId, req.body);
            if (!updated) {
                res.status(404).json({ success: false, message: 'Provider not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
}
export const providerController = new ProviderController();
