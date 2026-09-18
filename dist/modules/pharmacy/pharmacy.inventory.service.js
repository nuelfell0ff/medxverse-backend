import { Types } from 'mongoose';
import { InventoryItemModel, InventoryTransactionModel } from './pharmacy.model.js';
import { InventoryTransactionType } from './pharmacy.types.js';
export class PharmacyInventoryService {
    static async atomicDecrement(hospitalId, inventoryItemId, quantity, performedBy, reason, referenceType, referenceId, session) {
        if (!Types.ObjectId.isValid(hospitalId)) {
            throw Object.assign(new Error('Invalid hospital ID.'), { statusCode: 400 });
        }
        if (!Types.ObjectId.isValid(inventoryItemId)) {
            throw Object.assign(new Error('Invalid inventory item ID.'), { statusCode: 400 });
        }
        if (!Types.ObjectId.isValid(performedBy)) {
            throw Object.assign(new Error('Invalid user ID.'), { statusCode: 400 });
        }
        if (!Types.ObjectId.isValid(referenceId)) {
            throw Object.assign(new Error('Invalid reference ID.'), { statusCode: 400 });
        }
        if (!Number.isInteger(quantity) || quantity <= 0) {
            throw Object.assign(new Error('Quantity must be a positive whole number.'), { statusCode: 400 });
        }
        const hospital = new Types.ObjectId(hospitalId);
        const itemId = new Types.ObjectId(inventoryItemId);
        const performerId = new Types.ObjectId(performedBy);
        const referenceObjectId = new Types.ObjectId(referenceId);
        const before = await InventoryItemModel.findOne({
            _id: itemId,
            hospitalId: hospital,
            isActive: true,
            expiryDate: { $gt: new Date() },
            quantityInStock: { $gte: quantity },
        }).session(session ?? null);
        if (!before) {
            throw Object.assign(new Error('Inventory item is unavailable, expired, or has insufficient stock.'), { statusCode: 409 });
        }
        const updated = await InventoryItemModel.findOneAndUpdate({
            _id: itemId,
            hospitalId: hospital,
            isActive: true,
            expiryDate: { $gt: new Date() },
            quantityInStock: { $gte: quantity },
        }, {
            $inc: {
                quantityInStock: -quantity,
            },
            $set: {
                isLowStock: before.quantityInStock - quantity <= before.reorderLevel,
            },
        }, {
            new: true,
            runValidators: true,
            session,
        });
        if (!updated) {
            throw Object.assign(new Error('Stock changed concurrently. Please rescan and retry.'), { statusCode: 409 });
        }
        await InventoryTransactionModel.create([
            {
                hospitalId: hospital,
                inventoryItemId: itemId,
                type: InventoryTransactionType.DISPENSE,
                quantity: -quantity,
                quantityBefore: before.quantityInStock,
                quantityAfter: updated.quantityInStock,
                referenceType,
                referenceId: referenceObjectId,
                performedBy: performerId,
                reason: reason?.trim() || 'Pharmacy dispense',
            },
        ], { session });
        return updated;
    }
    static async adjust(hospitalId, inventoryItemId, quantityChange, type, performedBy, reason, session) {
        if (!Types.ObjectId.isValid(hospitalId)) {
            throw Object.assign(new Error('Invalid hospital ID.'), { statusCode: 400 });
        }
        if (!Types.ObjectId.isValid(inventoryItemId)) {
            throw Object.assign(new Error('Invalid inventory item ID.'), { statusCode: 400 });
        }
        if (!Types.ObjectId.isValid(performedBy)) {
            throw Object.assign(new Error('Invalid user ID.'), { statusCode: 400 });
        }
        if (!Number.isInteger(quantityChange) || quantityChange === 0) {
            throw Object.assign(new Error('Stock adjustment must be a non-zero whole number.'), { statusCode: 400 });
        }
        const resolvedType = quantityChange > 0
            ? InventoryTransactionType.ADJUSTMENT_IN
            : InventoryTransactionType.ADJUSTMENT_OUT;
        const allowedTypes = new Set([
            InventoryTransactionType.ADJUSTMENT_IN,
            InventoryTransactionType.ADJUSTMENT_OUT,
        ]);
        const transactionType = type && allowedTypes.has(type)
            ? type
            : resolvedType;
        const expectedType = quantityChange > 0
            ? InventoryTransactionType.ADJUSTMENT_IN
            : InventoryTransactionType.ADJUSTMENT_OUT;
        const finalType = transactionType === expectedType
            ? transactionType
            : expectedType;
        const hospital = new Types.ObjectId(hospitalId);
        const itemId = new Types.ObjectId(inventoryItemId);
        const performerId = new Types.ObjectId(performedBy);
        const before = await InventoryItemModel.findOne({
            _id: itemId,
            hospitalId: hospital,
        }).session(session ?? null);
        if (!before) {
            throw Object.assign(new Error('Inventory item not found.'), { statusCode: 404 });
        }
        const filter = {
            _id: itemId,
            hospitalId: hospital,
        };
        if (quantityChange < 0) {
            filter.quantityInStock = {
                $gte: Math.abs(quantityChange),
            };
        }
        const newQuantity = before.quantityInStock + quantityChange;
        if (newQuantity < 0) {
            throw Object.assign(new Error('Stock adjustment cannot make inventory negative.'), { statusCode: 409 });
        }
        const updated = await InventoryItemModel.findOneAndUpdate(filter, {
            $inc: {
                quantityInStock: quantityChange,
            },
            $set: {
                isLowStock: newQuantity <= before.reorderLevel,
            },
        }, {
            new: true,
            runValidators: true,
            session,
        });
        if (!updated) {
            throw Object.assign(new Error('Stock adjustment failed because stock changed concurrently or would become negative.'), { statusCode: 409 });
        }
        await InventoryTransactionModel.create([
            {
                hospitalId: hospital,
                inventoryItemId: itemId,
                type: finalType,
                quantity: quantityChange,
                quantityBefore: before.quantityInStock,
                quantityAfter: updated.quantityInStock,
                performedBy: performerId,
                reason: reason?.trim() || 'Manual pharmacy stock adjustment',
            },
        ], { session });
        return updated;
    }
}
