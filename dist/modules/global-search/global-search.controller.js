import { GlobalSearchService } from './global-search.service.js';
export class GlobalSearchController {
    static async search(req, res) {
        try {
            const account = req.account;
            if (account?.accountType !== 'HOSPITAL' || !account.accountId) {
                res.status(403).json({ success: false, message: 'Global HMS search is only available to hospital accounts.' });
                return;
            }
            const query = String(req.query.q || '').trim();
            if (query.length < 2) {
                res.status(200).json({ success: true, data: [] });
                return;
            }
            const results = await GlobalSearchService.search(String(account.accountId), query, Number(req.query.limit || 30));
            res.status(200).json({ success: true, data: results });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error?.message || 'Global search failed' });
        }
    }
}
