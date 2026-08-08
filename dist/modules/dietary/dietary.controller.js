import { dietaryService } from './dietary.service.js';
export class DietaryController {
    async createDietaryOrder(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const orderedById = authReq.user._id;
            const { patientId, dietType, allergies, restrictions, specialInstructions, startDate, endDate } = req.body;
            const order = await dietaryService.createDietaryOrder({
                hospitalId,
                patientId,
                orderedById,
                dietType: dietType,
                allergies,
                restrictions,
                specialInstructions,
                startDate,
                endDate,
            });
            res.status(201).json({ success: true, data: order });
        }
        catch (error) {
            next(error);
        }
    }
    async getDietaryOrders(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const patientId = req.query.patientId;
            const dietType = req.query.dietType;
            const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
            const result = await dietaryService.getDietaryOrders(hospitalId, {
                page,
                limit,
                patientId,
                dietType,
                isActive,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getDietaryOrderById(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const order = await dietaryService.getDietaryOrderById(id, hospitalId);
            if (!order) {
                res.status(404).json({ success: false, message: 'Dietary order not found' });
                return;
            }
            res.status(200).json({ success: true, data: order });
        }
        catch (error) {
            next(error);
        }
    }
    async updateDietaryOrder(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const { dietType, allergies, restrictions, specialInstructions, endDate, isActive } = req.body;
            const updated = await dietaryService.updateDietaryOrder(id, hospitalId, {
                dietType: dietType,
                allergies,
                restrictions,
                specialInstructions,
                endDate,
                isActive,
            });
            if (!updated) {
                res.status(404).json({ success: false, message: 'Dietary order not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async createMealDelivery(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const { dietaryOrderId, patientId, mealType, scheduledDate, deliveryNotes } = req.body;
            const delivery = await dietaryService.createMealDelivery({
                hospitalId,
                dietaryOrderId,
                patientId,
                mealType: mealType,
                scheduledDate,
                deliveryNotes,
            });
            res.status(201).json({ success: true, data: delivery });
        }
        catch (error) {
            next(error);
        }
    }
    async getMealDeliveries(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const patientId = req.query.patientId;
            const dietaryOrderId = req.query.dietaryOrderId;
            const mealType = req.query.mealType;
            const status = req.query.status;
            const scheduledDate = req.query.scheduledDate;
            const result = await dietaryService.getMealDeliveries(hospitalId, {
                page,
                limit,
                patientId,
                dietaryOrderId,
                mealType,
                status,
                scheduledDate,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async updateMealDeliveryStatus(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const userId = authReq.user._id;
            const id = req.params.id;
            const { status, deliveryNotes } = req.body;
            const updated = await dietaryService.updateMealDeliveryStatus(id, hospitalId, {
                status: status,
                deliveredById: userId,
                deliveryNotes,
            });
            if (!updated) {
                res.status(404).json({ success: false, message: 'Meal delivery record not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
}
export const dietaryController = new DietaryController();
