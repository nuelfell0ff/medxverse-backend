import { Schema, model } from 'mongoose';
import { DietType, MealType, MealDeliveryStatus, } from './dietary.types.js';
const DietaryOrderSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    orderedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dietType: {
        type: String,
        enum: Object.values(DietType),
        required: true,
        index: true,
    },
    allergies: [{ type: String, trim: true }],
    restrictions: [{ type: String, trim: true }],
    specialInstructions: { type: String, trim: true },
    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });
DietaryOrderSchema.index({ hospitalId: 1, patientId: 1, isActive: 1 });
export const DietaryOrderModel = model('DietaryOrder', DietaryOrderSchema);
const MealDeliverySchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    dietaryOrderId: {
        type: Schema.Types.ObjectId,
        ref: 'DietaryOrder',
        required: true,
        index: true,
    },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    mealType: {
        type: String,
        enum: Object.values(MealType),
        required: true,
        index: true,
    },
    scheduledDate: { type: Date, required: true, index: true },
    status: {
        type: String,
        enum: Object.values(MealDeliveryStatus),
        default: MealDeliveryStatus.PREPARED,
        required: true,
        index: true,
    },
    deliveredById: { type: Schema.Types.ObjectId, ref: 'User' },
    deliveredAt: { type: Date },
    deliveryNotes: { type: String, trim: true },
}, { timestamps: true });
MealDeliverySchema.index({ hospitalId: 1, scheduledDate: 1, status: 1 });
export const MealDeliveryModel = model('MealDelivery', MealDeliverySchema);
