import { PharmacyService, } from './pharmacy.service.js';
/* =========================================================
   CONTROLLER
========================================================= */
export class PharmacyController {
    /* =======================================================
       INVENTORY
    ======================================================= */
    static async createItem(req, res, next) {
        try {
            const authReq = req;
            const user = authReq.user;
            const hospitalId = user.hospitalId ||
                user.id;
            const item = await PharmacyService.createInventoryItem(hospitalId, authReq.body);
            res.status(201).json({
                success: true,
                data: item,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async listInventory(req, res, next) {
        try {
            const authReq = req;
            const user = authReq.user;
            const hospitalId = user.hospitalId ||
                user.id;
            const result = await PharmacyService.getInventory(hospitalId, authReq.query);
            res.status(200).json({
                success: true,
                ...result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getItemById(req, res, next) {
        try {
            const authReq = req;
            const user = authReq.user;
            const hospitalId = user.hospitalId ||
                user.id;
            const itemId = req.params.id;
            const item = await PharmacyService.getInventoryItemById(hospitalId, itemId);
            res.status(200).json({
                success: true,
                data: item,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async adjustStock(req, res, next) {
        try {
            const authReq = req;
            const user = authReq.user;
            const hospitalId = user.hospitalId ||
                user.id;
            const itemId = req.params.id;
            const updated = await PharmacyService.updateStock(hospitalId, itemId, authReq.body);
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /* =======================================================
       BILLING PRICING CATALOGUE
    ======================================================= */
    static async listPricingCatalogues(req, res, next) {
        try {
            const authReq = req;
            const user = authReq.user;
            const hospitalId = user.hospitalId || user.id;
            const result = await PharmacyService.getPricingCatalogues(hospitalId, authReq.query);
            res.status(200).json({
                success: true,
                ...result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /* =======================================================
       DISPENSING
    ======================================================= */
    static async dispenseDrugs(req, res, next) {
        try {
            const authReq = req;
            const user = authReq.user;
            const hospitalId = user.hospitalId ||
                user.id;
            const record = await PharmacyService.createDispenseRecord(hospitalId, user.id, authReq.body);
            res.status(201).json({
                success: true,
                data: record,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /* =======================================================
       RETRY BILLING
    ======================================================= */
    static async retryBilling(req, res, next) {
        try {
            const authReq = req;
            const user = authReq.user;
            const hospitalId = user.hospitalId ||
                user.id;
            const record = await PharmacyService.retryBilling(hospitalId, user.id, req.params.id);
            res.status(200).json({
                success: true,
                message: 'Pharmacy billing retry completed.',
                data: record,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /* =======================================================
       LIST DISPENSE RECORDS
    ======================================================= */
    static async listDispenseRecords(req, res, next) {
        try {
            const authReq = req;
            const user = authReq.user;
            const hospitalId = user.hospitalId ||
                user.id;
            const result = await PharmacyService.getDispenseRecords(hospitalId, authReq.query);
            res.status(200).json({
                success: true,
                ...result,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
