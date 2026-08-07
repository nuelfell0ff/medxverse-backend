import { Types } from 'mongoose';
import {
  SupplierModel,
  InventoryItemModel,
  PurchaseOrderModel,
  EquipmentModel,
} from './inventory.model.js';
import {
  CreateSupplierInput,
  CreateInventoryItemInput,
  CreatePurchaseOrderInput,
  CreateEquipmentInput,
  GetInventoryItemsQuery,
  GetPurchaseOrdersQuery,
  GetEquipmentQuery,
  ISupplierDocument,
  IInventoryItemDocument,
  IPurchaseOrderDocument,
  IEquipmentDocument,
  PurchaseOrderStatus,
} from './inventory.types.js';

export class InventoryService {
  public async createSupplier(input: CreateSupplierInput): Promise<ISupplierDocument> {
    return SupplierModel.create({
      ...input,
      hospitalId: new Types.ObjectId(input.hospitalId),
    });
  }

  public async getSuppliers(hospitalId: string): Promise<ISupplierDocument[]> {
    return SupplierModel.find({ hospitalId, isActive: true }).sort({ name: 1 }).exec();
  }

  public async createInventoryItem(
    input: CreateInventoryItemInput
  ): Promise<IInventoryItemDocument> {
    return InventoryItemModel.create({
      ...input,
      hospitalId: new Types.ObjectId(input.hospitalId),
      supplierId: input.supplierId ? new Types.ObjectId(input.supplierId) : undefined,
    });
  }

  public async getInventoryItems(
    hospitalId: string,
    query: GetInventoryItemsQuery
  ): Promise<{
    items: IInventoryItemDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hospitalId, isActive: true };

    if (query.category) filter.category = query.category;
    if (query.reorderAlertsOnly) {
      filter.$expr = { $lte: ['$quantityOnHand', '$reorderPoint'] };
    }
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { sku: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      InventoryItemModel.find(filter)
        .populate('supplierId', 'name code')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      InventoryItemModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async createPurchaseOrder(
    input: CreatePurchaseOrderInput
  ): Promise<IPurchaseOrderDocument> {
    const poNumber = `PO-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const itemIds = input.items.map((i) => i.itemId);
    const catalogItems = await InventoryItemModel.find({ _id: { $in: itemIds } }).exec();

    let totalAmount = 0;
    const formattedItems = input.items.map((item) => {
      const catalog = catalogItems.find((c) => c._id.toString() === item.itemId);
      const totalCost = item.quantityOrdered * item.unitCost;
      totalAmount += totalCost;

      return {
        itemId: new Types.ObjectId(item.itemId),
        sku: catalog ? catalog.sku : 'N/A',
        name: catalog ? catalog.name : 'Unknown Item',
        quantityOrdered: item.quantityOrdered,
        quantityReceived: 0,
        unitCost: item.unitCost,
        totalCost,
      };
    });

    return PurchaseOrderModel.create({
      hospitalId: new Types.ObjectId(input.hospitalId),
      poNumber,
      supplierId: new Types.ObjectId(input.supplierId),
      createdById: new Types.ObjectId(input.createdById),
      items: formattedItems,
      totalAmount,
      expectedDeliveryDate: input.expectedDeliveryDate
        ? new Date(input.expectedDeliveryDate)
        : undefined,
      notes: input.notes,
      status: PurchaseOrderStatus.ORDERED,
    });
  }

  public async getPurchaseOrders(
    hospitalId: string,
    query: GetPurchaseOrdersQuery
  ): Promise<{
    orders: IPurchaseOrderDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hospitalId };

    if (query.supplierId) filter.supplierId = query.supplierId;
    if (query.status) filter.status = query.status;

    const [orders, total] = await Promise.all([
      PurchaseOrderModel.find(filter)
        .populate('supplierId', 'name code email phone')
        .populate('createdById', 'firstName lastName role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      PurchaseOrderModel.countDocuments(filter),
    ]);

    return {
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async createEquipment(input: CreateEquipmentInput): Promise<IEquipmentDocument> {
    return EquipmentModel.create({
      ...input,
      hospitalId: new Types.ObjectId(input.hospitalId),
      departmentId: input.departmentId ? new Types.ObjectId(input.departmentId) : undefined,
      supplierId: input.supplierId ? new Types.ObjectId(input.supplierId) : undefined,
      purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : undefined,
      nextServiceDueDate: input.nextServiceDueDate
        ? new Date(input.nextServiceDueDate)
        : undefined,
    });
  }

  public async getEquipment(
    hospitalId: string,
    query: GetEquipmentQuery
  ): Promise<{
    equipment: IEquipmentDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hospitalId };

    if (query.departmentId) filter.departmentId = query.departmentId;
    if (query.status) filter.status = query.status;
    if (query.dueServiceOnly) {
      filter.nextServiceDueDate = { $lte: new Date() };
    }

    const [equipment, total] = await Promise.all([
      EquipmentModel.find(filter)
        .populate('departmentId', 'name code')
        .populate('supplierId', 'name code')
        .sort({ nextServiceDueDate: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      EquipmentModel.countDocuments(filter),
    ]);

    return {
      equipment,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const inventoryService = new InventoryService();