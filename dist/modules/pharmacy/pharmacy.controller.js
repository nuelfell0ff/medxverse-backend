import { PharmacyService } from './pharmacy.service.js';
export class PharmacyController {
    static getHospitalId(req) {
        const r = req;
        const a = r.account;
        const u = r.user;
        const id = a?.accountId ?? a?.hospitalId ?? a?.hospital ?? a?.id ?? a?._id
            ?? u?.hospitalId ?? u?.hospital ?? u?.accountId ?? u?.id ?? u?._id;
        return id ? String(id) : null;
    }
    static hospital(req, res) {
        const id = PharmacyController.getHospitalId(req);
        if (!id) {
            res.status(401).json({ statusCode: 401, success: false, message: 'Authenticated hospital context is missing.', errors: [] });
            return null;
        }
        return id;
    }
    static async createItem(req, res, next) {
        try {
            const h = PharmacyController.hospital(req, res);
            if (!h)
                return;
            res.status(201).json({ success: true, data: await PharmacyService.createInventoryItem(h, req.body) });
        }
        catch (e) {
            next(e);
        }
    }
    static async listInventory(req, res, next) {
        try {
            const h = PharmacyController.hospital(req, res);
            if (!h)
                return;
            res.json({ success: true, ...(await PharmacyService.getInventory(h, req.query)) });
        }
        catch (e) {
            next(e);
        }
    }
    static async getItemById(req, res, next) {
        try {
            const h = PharmacyController.hospital(req, res);
            if (!h)
                return;
            res.json({ success: true, data: await PharmacyService.getInventoryItemById(h, req.params.id) });
        }
        catch (e) {
            next(e);
        }
    }
    static async adjustStock(req, res, next) {
        try {
            const h = PharmacyController.hospital(req, res);
            if (!h)
                return;
            const r = req;
            const userId = String(r.user?.id ?? r.user?._id ?? r.account?.accountId ?? '');
            if (!userId)
                throw Object.assign(new Error('Authenticated user context is missing.'), { statusCode: 401 });
            res.json({ success: true, data: await PharmacyService.updateStock(h, userId, req.params.id, req.body) });
        }
        catch (e) {
            next(e);
        }
    }
    static async createPrescription(req, res, next) {
        try {
            const h = PharmacyController.hospital(req, res);
            if (!h)
                return;
            res.status(201).json({ success: true, data: await PharmacyService.createPrescription(h, req.body) });
        }
        catch (e) {
            next(e);
        }
    }
    static async listPrescriptions(req, res, next) {
        try {
            const h = PharmacyController.hospital(req, res);
            if (!h)
                return;
            res.json({ success: true, ...(await PharmacyService.getPrescriptions(h, req.query)) });
        }
        catch (e) {
            next(e);
        }
    }
    static async getPrescriptionById(req, res, next) {
        try {
            const h = PharmacyController.hospital(req, res);
            if (!h)
                return;
            res.json({ success: true, data: await PharmacyService.getPrescriptionById(h, req.params.id) });
        }
        catch (e) {
            next(e);
        }
    }
    static async screenPrescription(req, res, next) {
        try {
            const h = PharmacyController.hospital(req, res);
            if (!h)
                return;
            res.json({ success: true, data: await PharmacyService.screenPrescription(h, req.params.id) });
        }
        catch (e) {
            next(e);
        }
    }
    static async approvePrescription(req, res, next) {
        try {
            const h = PharmacyController.hospital(req, res);
            if (!h)
                return;
            const r = req;
            const pharmacistId = String(r.user?.id ?? r.user?._id ?? r.account?.accountId ?? '');
            res.json({ success: true, data: await PharmacyService.approvePrescription(h, req.params.id, pharmacistId) });
        }
        catch (e) {
            next(e);
        }
    }
    static async dispenseDrugs(req, res, next) {
        try {
            const h = PharmacyController.hospital(req, res);
            if (!h)
                return;
            const r = req;
            const pharmacistId = String(r.user?.id ?? r.user?._id ?? r.account?.accountId ?? '');
            if (!pharmacistId)
                throw Object.assign(new Error('Authenticated pharmacist context is missing.'), { statusCode: 401 });
            res.status(201).json({ success: true, data: await PharmacyService.createDispenseRecord(h, pharmacistId, req.body) });
        }
        catch (e) {
            next(e);
        }
    }
    static async listDispenseRecords(req, res, next) {
        try {
            const h = PharmacyController.hospital(req, res);
            if (!h)
                return;
            res.json({ success: true, ...(await PharmacyService.getDispenseRecords(h, req.query)) });
        }
        catch (e) {
            next(e);
        }
    }
    static async createFormulary(req, res, next) {
        try {
            const h = PharmacyController.hospital(req, res);
            if (!h)
                return;
            res.status(201).json({ success: true, data: await PharmacyService.createFormularyEntry(h, req.body) });
        }
        catch (e) {
            next(e);
        }
    }
    static async listFormulary(req, res, next) {
        try {
            const h = PharmacyController.hospital(req, res);
            if (!h)
                return;
            res.json({ success: true, ...(await PharmacyService.getFormulary(h, req.query)) });
        }
        catch (e) {
            next(e);
        }
    }
    static async inventoryLedger(req, res, next) {
        try {
            const h = PharmacyController.hospital(req, res);
            if (!h)
                return;
            res.json({ success: true, data: await PharmacyService.getInventoryLedger(h, req.params.id, Number(req.query.page) || 1, Number(req.query.limit) || 50) });
        }
        catch (e) {
            next(e);
        }
    }
}
