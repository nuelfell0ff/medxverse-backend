import { Types } from 'mongoose';
import { DietaryOrderModel, MealDeliveryModel } from './dietary.model.js';
import { MealDeliveryStatus, } from './dietary.types.js';
export class DietaryService {
    async createDietaryOrder(input) {
        return DietaryOrderModel.create({
            ...input,
            hospitalId: new Types.ObjectId(input.hospitalId),
            patientId: new Types.ObjectId(input.patientId),
            orderedById: new Types.ObjectId(input.orderedById),
            startDate: new Date(input.startDate),
            endDate: input.endDate ? new Date(input.endDate) : undefined,
        });
    }
    async getDietaryOrders(hospitalId, query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(50, Math.max(1, query.limit || 20));
        const skip = (page - 1) * limit;
        const filter = { hospitalId };
        if (query.patientId)
            filter.patientId = query.patientId;
        if (query.dietType)
            filter.dietType = query.dietType;
        if (query.isActive !== undefined)
            filter.isActive = query.isActive;
        const [orders, total] = await Promise.all([
            DietaryOrderModel.find(filter)
                .populate('patientId', 'firstName lastName mrn dateOfBirth gender roomNumber ward')
                .populate('orderedById', 'firstName lastName role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            DietaryOrderModel.countDocuments(filter),
        ]);
        return {
            orders,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getDietaryOrderById(orderId, hospitalId) {
        return DietaryOrderModel.findOne({ _id: orderId, hospitalId })
            .populate('patientId', 'firstName lastName mrn dateOfBirth gender roomNumber ward allergies')
            .populate('orderedById', 'firstName lastName role')
            .exec();
    }
    async updateDietaryOrder(orderId, hospitalId, input) {
        const updateData = { ...input };
        if (input.endDate)
            updateData.endDate = new Date(input.endDate);
        return DietaryOrderModel.findOneAndUpdate({ _id: orderId, hospitalId }, { $set: updateData }, { new: true }).exec();
    }
    async createMealDelivery(input) {
        return MealDeliveryModel.create({
            ...input,
            hospitalId: new Types.ObjectId(input.hospitalId),
            dietaryOrderId: new Types.ObjectId(input.dietaryOrderId),
            patientId: new Types.ObjectId(input.patientId),
            scheduledDate: new Date(input.scheduledDate),
        });
    }
    async getMealDeliveries(hospitalId, query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(50, Math.max(1, query.limit || 20));
        const skip = (page - 1) * limit;
        const filter = { hospitalId };
        if (query.patientId)
            filter.patientId = query.patientId;
        if (query.dietaryOrderId)
            filter.dietaryOrderId = query.dietaryOrderId;
        if (query.mealType)
            filter.mealType = query.mealType;
        if (query.status)
            filter.status = query.status;
        if (query.scheduledDate) {
            const startOfDay = new Date(query.scheduledDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(query.scheduledDate);
            endOfDay.setHours(23, 59, 59, 999);
            filter.scheduledDate = { $gte: startOfDay, $lte: endOfDay };
        }
        const [deliveries, total] = await Promise.all([
            MealDeliveryModel.find(filter)
                .populate('patientId', 'firstName lastName mrn roomNumber ward')
                .populate('dietaryOrderId', 'dietType restrictions allergies specialInstructions')
                .populate('deliveredById', 'firstName lastName role')
                .sort({ scheduledDate: 1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            MealDeliveryModel.countDocuments(filter),
        ]);
        return {
            deliveries,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    async updateMealDeliveryStatus(deliveryId, hospitalId, input) {
        const updateData = {
            status: input.status,
        };
        if (input.deliveredById) {
            updateData.deliveredById = new Types.ObjectId(input.deliveredById);
        }
        if (input.status === MealDeliveryStatus.DELIVERED) {
            updateData.deliveredAt = new Date();
        }
        if (input.deliveryNotes) {
            updateData.deliveryNotes = input.deliveryNotes;
        }
        return MealDeliveryModel.findOneAndUpdate({ _id: deliveryId, hospitalId }, { $set: updateData }, { new: true }).exec();
    }
}
export const dietaryService = new DietaryService();
