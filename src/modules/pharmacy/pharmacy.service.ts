import { Types } from 'mongoose';
import { InventoryItemModel, DispenseRecordModel } from './pharmacy.model.js';
import {
  CreateInventoryItemDTO,
  UpdateStockDTO,
  CreateDispenseRecordDTO,
  GetInventoryQueryDTO,
  GetDispenseQueryDTO,
  IInventoryItemDocument,
  IDispenseRecordDocument,
  DispenseStatus,
  IDispenseItem,
} from './pharmacy.types.js';

export class PharmacyService {
  static async createInventoryItem(
    hospitalId: string,
    dto: CreateInventoryItemDTO
  ): Promise<IInventoryItemDocument> {
    const reorderLevel = dto.reorderLevel ?? 10;
    const isLowStock = dto.quantityInStock <= reorderLevel;

    const item = await InventoryItemModel.create({
      hospitalId: new Types.ObjectId(hospitalId),
      name: dto.name,
      genericName: dto.genericName,
      category: dto.category,
      batchNumber: dto.batchNumber,
      unitPrice: dto.unitPrice,
      quantityInStock: dto.quantityInStock,
      reorderLevel,
      unitOfMeasure: dto.unitOfMeasure,
      expiryDate: new Date(dto.expiryDate),
      isLowStock,
    });

    return item;
  }

  static async getInventory(hospitalId: string, query: GetInventoryQueryDTO) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hospitalId };

    if (query.category) {
      filter.category = query.category;
    }

    if (query.isLowStock === 'true') {
      filter.isLowStock = true;
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { genericName: { $regex: query.search, $options: 'i' } },
        { batchNumber: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      InventoryItemModel.find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      InventoryItemModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  static async getInventoryItemById(
    hospitalId: string,
    itemId: string
  ): Promise<IInventoryItemDocument> {
    const item = await InventoryItemModel.findOne({ _id: itemId, hospitalId });
    if (!item) {
      const error = new Error('Inventory item not found.') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }
    return item;
  }

  static async updateStock(
    hospitalId: string,
    itemId: string,
    dto: UpdateStockDTO
  ): Promise<IInventoryItemDocument> {
    const item = await this.getInventoryItemById(hospitalId, itemId);

    const newQuantity = item.quantityInStock + dto.quantityChange;
    if (newQuantity < 0) {
      const error = new Error('Stock quantity cannot drop below 0.') as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    item.quantityInStock = newQuantity;
    item.isLowStock = newQuantity <= item.reorderLevel;

    await item.save();
    return item;
  }

  static async createDispenseRecord(
    hospitalId: string,
    dispensedByUserId: string,
    dto: CreateDispenseRecordDTO
  ): Promise<IDispenseRecordDocument> {
    const processedItems: IDispenseItem[] = [];
    let totalAmount = 0;

    for (const reqItem of dto.items) {
      const inventoryItem = await InventoryItemModel.findOne({
        _id: reqItem.inventoryItemId,
        hospitalId,
      });

      if (!inventoryItem) {
        const error = new Error(`Item ID ${reqItem.inventoryItemId} not found in inventory.`) as Error & { statusCode?: number };
        error.statusCode = 404;
        throw error;
      }

      if (inventoryItem.quantityInStock < reqItem.quantity) {
        const error = new Error(
          `Insufficient stock for '${inventoryItem.name}'. Available: ${inventoryItem.quantityInStock}, Requested: ${reqItem.quantity}`
        ) as Error & { statusCode?: number };
        error.statusCode = 400;
        throw error;
      }

      // Deduct stock
      inventoryItem.quantityInStock -= reqItem.quantity;
      inventoryItem.isLowStock = inventoryItem.quantityInStock <= inventoryItem.reorderLevel;
      await inventoryItem.save();

      const itemTotal = inventoryItem.unitPrice * reqItem.quantity;
      totalAmount += itemTotal;

      processedItems.push({
        inventoryItemId: inventoryItem._id,
        quantity: reqItem.quantity,
        unitPrice: inventoryItem.unitPrice,
        totalPrice: itemTotal,
      });
    }

    const dispenseRecord = await DispenseRecordModel.create({
      hospitalId: new Types.ObjectId(hospitalId),
      patientId: new Types.ObjectId(dto.patientId),
      consultationId: dto.consultationId ? new Types.ObjectId(dto.consultationId) : undefined,
      dispensedBy: new Types.ObjectId(dispensedByUserId),
      items: processedItems,
      totalAmount,
      status: DispenseStatus.DISPENSED,
      notes: dto.notes,
    });

    return dispenseRecord.populate([
      { path: 'patientId', select: 'firstName lastName mrn phone' },
      { path: 'dispensedBy', select: 'firstName lastName email' },
      { path: 'items.inventoryItemId', select: 'name genericName unitOfMeasure' },
    ]);
  }

  static async getDispenseRecords(hospitalId: string, query: GetDispenseQueryDTO) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hospitalId };

    if (query.patientId) {
      filter.patientId = new Types.ObjectId(query.patientId);
    }

    if (query.status) {
      filter.status = query.status;
    }

    const [records, total] = await Promise.all([
      DispenseRecordModel.find(filter)
        .populate('patientId', 'firstName lastName mrn phone')
        .populate('dispensedBy', 'firstName lastName email')
        .populate('items.inventoryItemId', 'name genericName unitOfMeasure')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      DispenseRecordModel.countDocuments(filter),
    ]);

    return {
      records,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }
}