import { inventoryService } from './inventory.service.js';
export class InventoryController {
    async createSupplier(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const { name, code, contactPerson, email, phone, address, paymentTerms } = req.body;
            const supplier = await inventoryService.createSupplier({
                hospitalId,
                name,
                code,
                contactPerson,
                email,
                phone,
                address,
                paymentTerms,
            });
            res.status(201).json({ success: true, data: supplier });
        }
        catch (error) {
            next(error);
        }
    }
    async getSuppliers(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const suppliers = await inventoryService.getSuppliers(hospitalId);
            res.status(200).json({ success: true, data: suppliers });
        }
        catch (error) {
            next(error);
        }
    }
    async createInventoryItem(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const { sku, name, category, description, unitOfMeasure, quantityOnHand, reorderPoint, unitCost, location, supplierId, } = req.body;
            const item = await inventoryService.createInventoryItem({
                hospitalId,
                sku,
                name,
                category: category,
                description,
                unitOfMeasure,
                quantityOnHand,
                reorderPoint,
                unitCost,
                location,
                supplierId,
            });
            res.status(201).json({ success: true, data: item });
        }
        catch (error) {
            next(error);
        }
    }
    async getInventoryItems(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const category = req.query.category;
            const reorderAlertsOnly = req.query.reorderAlertsOnly === 'true';
            const search = req.query.search;
            const result = await inventoryService.getInventoryItems(hospitalId, {
                page,
                limit,
                category,
                reorderAlertsOnly,
                search,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async createPurchaseOrder(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const createdById = authReq.user._id;
            const { supplierId, items, expectedDeliveryDate, notes } = req.body;
            const po = await inventoryService.createPurchaseOrder({
                hospitalId,
                supplierId,
                createdById,
                items,
                expectedDeliveryDate,
                notes,
            });
            res.status(201).json({ success: true, data: po });
        }
        catch (error) {
            next(error);
        }
    }
    async getPurchaseOrders(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const supplierId = req.query.supplierId;
            const status = req.query.status;
            const result = await inventoryService.getPurchaseOrders(hospitalId, {
                page,
                limit,
                supplierId,
                status,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async createEquipment(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const { assetTag, name, modelNumber, serialNumber, manufacturer, departmentId, supplierId, status, purchaseDate, purchaseCost, nextServiceDueDate, notes, } = req.body;
            const equipment = await inventoryService.createEquipment({
                hospitalId,
                assetTag,
                name,
                modelNumber,
                serialNumber,
                manufacturer,
                departmentId,
                supplierId,
                status: status,
                purchaseDate,
                purchaseCost,
                nextServiceDueDate,
                notes,
            });
            res.status(201).json({ success: true, data: equipment });
        }
        catch (error) {
            next(error);
        }
    }
    async getEquipment(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const departmentId = req.query.departmentId;
            const status = req.query.status;
            const dueServiceOnly = req.query.dueServiceOnly === 'true';
            const result = await inventoryService.getEquipment(hospitalId, {
                page,
                limit,
                departmentId,
                status,
                dueServiceOnly,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
}
export const inventoryController = new InventoryController();
