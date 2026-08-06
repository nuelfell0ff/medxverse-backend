import { Document, Types } from 'mongoose';

export type DrugCategory =
  | 'ANALGESIC'
  | 'ANTIBIOTIC'
  | 'ANTIVIRAL'
  | 'ANTIHYPERTENSIVE'
  | 'ANTIDIABETIC'
  | 'ANTIHISTAMINE'
  | 'SUPPLEMENT'
  | 'OTHER';

export type PaymentStatus = 'PENDING' | 'PAID' | 'COVERED_BY_HMO';

export interface IDrug {
  name: string;
  genericName?: string;
  category: DrugCategory;
  sku: string;
  batchNumber: string;
  quantityInStock: number;
  reorderLevel: number;
  unitPrice: number;
  expiryDate: Date;
  manufacturer?: string;
  organizationId: Types.ObjectId;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IDrugDocument extends IDrug, Document {
  _id: Types.ObjectId;
}

export interface CreateDrugDto {
  name: string;
  genericName?: string;
  category: DrugCategory;
  sku?: string;
  batchNumber: string;
  quantityInStock: number;
  reorderLevel?: number;
  unitPrice: number;
  expiryDate: string | Date;
  manufacturer?: string;
}

export interface UpdateDrugDto {
  name?: string;
  genericName?: string;
  category?: DrugCategory;
  batchNumber?: string;
  quantityInStock?: number;
  reorderLevel?: number;
  unitPrice?: number;
  expiryDate?: string | Date;
  manufacturer?: string;
  isActive?: boolean;
}

export interface IDispensedItem {
  drugId: Types.ObjectId;
  drugName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface IDispenseRecord {
  patientId: Types.ObjectId;
  opdVisitId?: Types.ObjectId;
  dispensedBy: Types.ObjectId;
  organizationId: Types.ObjectId;
  items: IDispensedItem[];
  totalAmount: number;
  paymentStatus: PaymentStatus;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IDispenseRecordDocument extends IDispenseRecord, Document {
  _id: Types.ObjectId;
}

export interface DispensePrescriptionDto {
  patientId: string;
  opdVisitId?: string;
  items: Array<{
    drugId: string;
    quantity: number;
  }>;
  paymentStatus?: PaymentStatus;
  notes?: string;
}

export interface DrugQueryFilters {
  category?: DrugCategory;
  lowStock?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}