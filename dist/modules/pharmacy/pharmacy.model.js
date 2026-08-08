import { Schema, model } from 'mongoose';
import { DrugCategory, UnitOfMeasure, DispenseStatus, } from './pharmacy.types.js';
const InventoryItemSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    genericName: { type: String, trim: true },
    category: {
        type: String,
        enum: Object.values(DrugCategory),
        default: DrugCategory.OTHER,
        index: true,
    },
    batchNumber: { type: String, required: true, trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantityInStock: { type: Number, required: true, default: 0, min: 0 },
    reorderLevel: { type: Number, required: true, default: 10, min: 0 },
    unitOfMeasure: {
        type: String,
        enum: Object.values(UnitOfMeasure),
        default: UnitOfMeasure.TABLET,
    },
    expiryDate: { type: Date, required: true, index: true },
    isLowStock: { type: Boolean, default: false, index: true },
}, { timestamps: true });
InventoryItemSchema.pre('save', function () {
    this.isLowStock = this.quantityInStock <= this.reorderLevel;
});
const DispenseItemSchema = new Schema({
    inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
}, { _id: false });
const DispenseRecordSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    consultationId: { type: Schema.Types.ObjectId, ref: 'Consultation', index: true },
    dispensedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [DispenseItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
        type: String,
        enum: Object.values(DispenseStatus),
        default: DispenseStatus.DISPENSED,
        index: true,
    },
    notes: { type: String, trim: true },
}, { timestamps: true });
export const InventoryItemModel = model('InventoryItem', InventoryItemSchema);
export const DispenseRecordModel = model('DispenseRecord', DispenseRecordSchema);
