import { hmoProviderService } from './provider.service.js';
import { AccreditationStatus, ProviderStatus, ProviderType } from './provider.types.js';
const hmoIdFromRequest = (req) => {
    const request = req;
    const user = request.user;
    const account = request.account;
    const value = user?.hmoId ?? user?.hmo?.hmoId ?? user?.hmo?._id ?? user?.hmo?.id ?? user?.organizationId ?? user?.account?.hmoId ?? account?.hmoId ?? request.hmoId ?? user?.accountId ?? user?.account?.accountId ?? account?.accountId ?? account?._id ?? account?.id ?? user?.id ?? user?._id;
    if (!value)
        throw Object.assign(new Error('HMO context is required'), { statusCode: 403 });
    return String(value);
};
const body = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return {};
    const record = value;
    return record.data && typeof record.data === 'object' && !Array.isArray(record.data) ? record.data : record;
};
const queryEnum = (value, values) => {
    if (typeof value !== 'string' || !value)
        return undefined;
    if (!values.includes(value))
        throw Object.assign(new Error(`Invalid query value: ${value}`), { statusCode: 400 });
    return value;
};
export class HMOProviderController {
    async create(req, res) {
        const provider = await hmoProviderService.createProvider(hmoIdFromRequest(req), body(req.body));
        res.status(201).json({ success: true, data: provider, message: 'Provider created successfully' });
    }
    async list(req, res) {
        const result = await hmoProviderService.getProviders(hmoIdFromRequest(req), {
            page: req.query.page,
            limit: req.query.limit,
            search: req.query.search,
            network: req.query.network,
            type: queryEnum(req.query.type, Object.values(ProviderType)),
            status: queryEnum(req.query.status, Object.values(ProviderStatus)),
            accreditationStatus: queryEnum(req.query.accreditationStatus, Object.values(AccreditationStatus)),
        });
        res.json({ success: true, data: result });
    }
    async stats(req, res) {
        res.json({ success: true, data: await hmoProviderService.getStats(hmoIdFromRequest(req)) });
    }
    async getById(req, res) {
        const provider = await hmoProviderService.getProviderById(req.params.id, hmoIdFromRequest(req));
        if (!provider) {
            res.status(404).json({ success: false, message: 'Provider not found' });
            return;
        }
        res.json({ success: true, data: provider });
    }
    async update(req, res) {
        const provider = await hmoProviderService.updateProvider(req.params.id, hmoIdFromRequest(req), body(req.body));
        if (!provider) {
            res.status(404).json({ success: false, message: 'Provider not found' });
            return;
        }
        res.json({ success: true, data: provider, message: 'Provider updated successfully' });
    }
    async setStatus(req, res) {
        const input = body(req.body);
        const status = queryEnum(input.status, Object.values(ProviderStatus));
        if (!status)
            throw Object.assign(new Error('Provider status is required'), { statusCode: 400 });
        const provider = await hmoProviderService.updateProviderStatus(req.params.id, hmoIdFromRequest(req), { status, reason: input.reason });
        if (!provider) {
            res.status(404).json({ success: false, message: 'Provider not found' });
            return;
        }
        res.json({ success: true, data: provider, message: 'Provider status updated successfully' });
    }
    async accreditation(req, res) {
        const input = body(req.body);
        const status = queryEnum(input.status, Object.values(AccreditationStatus));
        if (!status)
            throw Object.assign(new Error('Accreditation status is required'), { statusCode: 400 });
        const provider = await hmoProviderService.updateAccreditation(req.params.id, hmoIdFromRequest(req), { ...input, status });
        if (!provider) {
            res.status(404).json({ success: false, message: 'Provider not found' });
            return;
        }
        res.json({ success: true, data: provider, message: 'Provider accreditation updated successfully' });
    }
    async performance(req, res) {
        const result = await hmoProviderService.getPerformance(req.params.id, hmoIdFromRequest(req));
        if (!result) {
            res.status(404).json({ success: false, message: 'Provider not found' });
            return;
        }
        res.json({ success: true, data: result });
    }
}
export const hmoProviderController = new HMOProviderController();
