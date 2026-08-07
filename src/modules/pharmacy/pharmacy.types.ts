import { Document, Types } from 'mongoose';

export enum DrugCategory {
  ANTIBIOTICS = 'ANTIBIOTICS',
  ANALGESICS = 'ANALGESICS',
  ANTIHYPERTENSIVES = 'ANTIHYPERTENSIVES',
  ANTIDIABETICS = 'ANTIDIABETICS',
  VITAMINS = 'VITAMINS',
  ICU_CRITICAL = 'ICU_CRITICAL',
  OTHER = 'OTHER',
}

export enum UnitOfMeasure {
  TABLET = 'TABLET',
  CAPSULE = 'CAPSULE',
  VIAL = 'VIAL',
  AMPOULE = 'AMPOULE',
  BOTTLE = 'BOTTLE',
  PACK = 'PACK',
  PIECE = 'PIECE',
}

export enum DispenseStatus {
  PENDING = 'PENDING',
  DISPENSED = 'DISPENSED',
  PARTIALLY_DISPENSED = 'PARTIALLY_DISPENSED',
  CANCELLED = 'CANCELLED',
}

export interface IInventoryItem {
  hospitalId: Types.ObjectId;
  name: string;
  genericName?: string;
  category: DrugCategory;
  batchNumber: string;
  unitPrice: number;
  quantityInStock: number;
  reorderLevel: number;
  unitOfMeasure: UnitOfMeasure;
  expiryDate: Date;
  isLowStock: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInventoryItemDocument extends IInventoryItem, Document {
  _id: Types.ObjectId;
}

export interface CreateInventoryItemDTO {
  name: string;
  genericName?: string;
  category: DrugCategory;
  batchNumber: string;
  unitPrice: number;
  quantityInStock: number;
  reorderLevel?: number;
  unitOfMeasure: UnitOfMeasure;
  expiryDate: string;
}

export interface UpdateStockDTO {
  quantityChange: number; // Positive to add stock, negative to adjust down
  reason?: string;
}

export interface IDispenseItem {
  inventoryItemId: Types.ObjectId;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface IDispenseItemDTO {
  inventoryItemId: string;
  quantity: number;
}

export interface IDispenseRecord {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  consultationId?: Types.ObjectId;
  dispensedBy: Types.ObjectId;
  items: IDispenseItem[];
  totalAmount: number;
  status: DispenseStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDispenseRecordDocument extends IDispenseRecord, Document {
  _id: Types.ObjectId;
}

export interface CreateDispenseRecordDTO {
  patientId: string;
  consultationId?: string;
  items: IDispenseItemDTO[];
  notes?: string;
}

export interface GetInventoryQueryDTO {
  search?: string;
  category?: DrugCategory;
  isLowStock?: string;
  page?: string;
  limit?: string;
}

export interface GetDispenseQueryDTO {
  patientId?: string;
  status?: DispenseStatus;
  page?: string;
  limit?: string;
}