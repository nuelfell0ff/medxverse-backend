import { tariffsService } from './tariffs.service.js';
const payload = (body) => body?.data ?? body;
/**
 * Resolve the authenticated HMO tenant.
 *
 * IMPORTANT:
 * hmoId comes exclusively from authentication context.
 * The client is never allowed to provide the tenant ID.
 */
const hmoIdFromRequest = (req) => {
    const authReq = req;
    /*
     * The authentication middleware should normalize HMO accounts
     * to req.user.hmoId.
     */
    if (authReq.user?.accountType === 'HMO' && authReq.user.hmoId) {
        return String(authReq.user.hmoId);
    }
    /*
     * Compatibility fallback for older JWT/account structures.
     */
    if (authReq.account?.accountType === 'HMO' &&
        authReq.account.accountId) {
        return String(authReq.account.accountId);
    }
    if (authReq.user?.hmoId) {
        return String(authReq.user.hmoId);
    }
    if (authReq.user?.accountType === 'HMO' &&
        authReq.user.accountId) {
        return String(authReq.user.accountId);
    }
    throw new Error('HMO context is required');
};
export class TariffsController {
    async create(req, res) {
        const tariff = await tariffsService.createTariff({
            ...payload(req.body),
            hmoId: hmoIdFromRequest(req),
        });
        return res.status(201).json({
            success: true,
            data: tariff,
            message: 'Tariff created successfully',
        });
    }
    async list(req, res) {
        const result = await tariffsService.getTariffs(hmoIdFromRequest(req), req.query);
        return res.json({
            success: true,
            data: result,
        });
    }
    async getById(req, res) {
        const tariff = await tariffsService.getTariffById(req.params.id, hmoIdFromRequest(req));
        if (!tariff) {
            return res.status(404).json({
                success: false,
                message: 'Tariff not found',
            });
        }
        return res.json({
            success: true,
            data: tariff,
        });
    }
    async update(req, res) {
        const tariff = await tariffsService.updateTariff(req.params.id, hmoIdFromRequest(req), payload(req.body));
        if (!tariff) {
            return res.status(404).json({
                success: false,
                message: 'Tariff not found',
            });
        }
        return res.json({
            success: true,
            data: tariff,
            message: 'Tariff updated successfully',
        });
    }
    async setStatus(req, res) {
        const body = payload(req.body);
        const tariff = await tariffsService.setStatus(req.params.id, hmoIdFromRequest(req), body?.status);
        if (!tariff) {
            return res.status(404).json({
                success: false,
                message: 'Tariff not found',
            });
        }
        return res.json({
            success: true,
            data: tariff,
            message: 'Tariff status updated successfully',
        });
    }
    async quote(req, res) {
        const quote = await tariffsService.quote(hmoIdFromRequest(req), payload(req.body));
        if (!quote) {
            return res.status(404).json({
                success: false,
                message: 'Active tariff not found',
            });
        }
        return res.json({
            success: true,
            data: quote,
        });
    }
    async stats(req, res) {
        const stats = await tariffsService.getStats(hmoIdFromRequest(req));
        return res.json({
            success: true,
            data: stats,
        });
    }
}
export const tariffsController = new TariffsController();
