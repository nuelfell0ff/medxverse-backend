import mongoose, { Schema, model } from 'mongoose';
import {
  ISupplierDocument,
  IInventoryItemDocument,
  IPurchaseOrderDocument,
  IEquipmentDocument,
  InventoryCategory,
  PurchaseOrderStatus,
  EquipmentStatus,
} from './inventory.types.js';

const SupplierSchema = new Schema<ISupplierDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    contactPerson: { type: String, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    paymentTerms: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

SupplierSchema.index({ hospitalId: 1, code: 1 }, { unique: true });

export const SupplierModel =
  mongoose.models.Supplier || model<ISupplierDocument>('Supplier', SupplierSchema);

const InventoryItemSchema = new Schema<IInventoryItemDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    sku: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: Object.values(InventoryCategory),
      required: true,
      index: true,
    },
    description: { type: String, trim: true },
    unitOfMeasure: { type: String, required: true, trim: true },
    quantityOnHand: { type: Number, required: true, default: 0, min: 0 },
    reorderPoint: { type: Number, required: true, default: 10, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    location: { type: String, trim: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

InventoryItemSchema.index({ hospitalId: 1, sku: 1 }, { unique: true });

export const InventoryItemModel =
  mongoose.models.InventoryItem || model<IInventoryItemDocument>('InventoryItem', InventoryItemSchema);

const PurchaseOrderItemSchema = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    quantityOrdered: { type: Number, required: true, min: 1 },
    quantityReceived: { type: Number, default: 0, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PurchaseOrderSchema = new Schema<IPurchaseOrderDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    poNumber: { type: String, required: true, unique: true, index: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: Object.values(PurchaseOrderStatus),
      default: PurchaseOrderStatus.DRAFT,
      index: true,
    },
    items: [PurchaseOrderItemSchema],
    totalAmount: { type: Number, required: true, min: 0 },
    orderDate: { type: Date, default: Date.now },
    expectedDeliveryDate: { type: Date },
    actualDeliveryDate: { type: Date },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

export const PurchaseOrderModel =
  mongoose.models.PurchaseOrder || model<IPurchaseOrderDocument>('PurchaseOrder', PurchaseOrderSchema);

const EquipmentSchema = new Schema<IEquipmentDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    assetTag: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    modelNumber: { type: String, trim: true },
    serialNumber: { type: String, trim: true },
    manufacturer: { type: String, trim: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', index: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', index: true },
    status: {
      type: String,
      enum: Object.values(EquipmentStatus),
      default: EquipmentStatus.OPERATIONAL,
      index: true,
    },
    purchaseDate: { type: Date },
    purchaseCost: { type: Number, min: 0 },
    lastServiceDate: { type: Date },
    nextServiceDueDate: { type: Date, index: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

EquipmentSchema.index({ hospitalId: 1, assetTag: 1 }, { unique: true });

export const EquipmentModel =
  mongoose.models.Equipment || model<IEquipmentDocument>('Equipment', EquipmentSchema);