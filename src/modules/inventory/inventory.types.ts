import { Document, Types } from 'mongoose';

export enum InventoryCategory {
  MEDICAL_SUPPLIES = 'MEDICAL_SUPPLIES',
  CONSUMABLES = 'CONSUMABLES',
  EQUIPMENT = 'EQUIPMENT',
  PHARMACEUTICALS = 'PHARMACEUTICALS',
  LAB_REAGENTS = 'LAB_REAGENTS',
}

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  ORDERED = 'ORDERED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export enum EquipmentStatus {
  OPERATIONAL = 'OPERATIONAL',
  UNDER_MAINTENANCE = 'UNDER_MAINTENANCE',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
  RETIRED = 'RETIRED',
}

export interface ISupplier {
  hospitalId: Types.ObjectId;
  name: string;
  code: string;
  contactPerson?: string;
  email: string;
  phone: string;
  address?: string;
  paymentTerms?: string;
  isActive: boolean;
}

export interface ISupplierDocument extends ISupplier, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IInventoryItem {
  hospitalId: Types.ObjectId;
  sku: string;
  name: string;
  category: InventoryCategory;
  description?: string;
  unitOfMeasure: string;
  quantityOnHand: number;
  reorderPoint: number;
  unitCost: number;
  location?: string; // Ward, Warehouse, or Shelf location
  supplierId?: Types.ObjectId;
  isActive: boolean;
}

export interface IInventoryItemDocument extends IInventoryItem, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IPurchaseOrderItem {
  itemId: Types.ObjectId;
  sku: string;
  name: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  totalCost: number;
}

export interface IPurchaseOrder {
  hospitalId: Types.ObjectId;
  poNumber: string;
  supplierId: Types.ObjectId;
  createdById: Types.ObjectId;
  status: PurchaseOrderStatus;
  items: IPurchaseOrderItem[];
  totalAmount: number;
  orderDate: Date;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  notes?: string;
}

export interface IPurchaseOrderDocument extends IPurchaseOrder, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IEquipment {
  hospitalId: Types.ObjectId;
  assetTag: string;
  name: string;
  modelNumber?: string;
  serialNumber?: string;
  manufacturer?: string;
  departmentId?: Types.ObjectId;
  supplierId?: Types.ObjectId;
  status: EquipmentStatus;
  purchaseDate?: Date;
  purchaseCost?: number;
  lastServiceDate?: Date;
  nextServiceDueDate?: Date;
  notes?: string;
}

export interface IEquipmentDocument extends IEquipment, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSupplierInput {
  hospitalId: string;
  name: string;
  code: string;
  contactPerson?: string;
  email: string;
  phone: string;
  address?: string;
  paymentTerms?: string;
}

export interface CreateInventoryItemInput {
  hospitalId: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  description?: string;
  unitOfMeasure: string;
  quantityOnHand: number;
  reorderPoint: number;
  unitCost: number;
  location?: string;
  supplierId?: string;
}

export interface CreatePurchaseOrderInput {
  hospitalId: string;
  supplierId: string;
  createdById: string;
  items: Array<{
    itemId: string;
    quantityOrdered: number;
    unitCost: number;
  }>;
  expectedDeliveryDate?: Date;
  notes?: string;
}

export interface CreateEquipmentInput {
  hospitalId: string;
  assetTag: string;
  name: string;
  modelNumber?: string;
  serialNumber?: string;
  manufacturer?: string;
  departmentId?: string;
  supplierId?: string;
  status?: EquipmentStatus;
  purchaseDate?: Date;
  purchaseCost?: number;
  nextServiceDueDate?: Date;
  notes?: string;
}

export interface GetInventoryItemsQuery {
  page?: number;
  limit?: number;
  category?: InventoryCategory;
  reorderAlertsOnly?: boolean;
  search?: string;
}

export interface GetPurchaseOrdersQuery {
  page?: number;
  limit?: number;
  supplierId?: string;
  status?: PurchaseOrderStatus;
}

export interface GetEquipmentQuery {
  page?: number;
  limit?: number;
  departmentId?: string;
  status?: EquipmentStatus;
  dueServiceOnly?: boolean;
}