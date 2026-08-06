import { Document, Types } from 'mongoose';

export enum MedicationCategory {
  TABLET = 'TABLET',
  CAPSULE = 'CAPSULE',
  SYRUP = 'SYRUP',
  INJECTION = 'INJECTION',
  CREAM = 'CREAM',
  DROPS = 'DROPS',
  INHALER = 'INHALER',
  OTHER = 'OTHER',
}

export enum PrescriptionStatus {
  PENDING = 'PENDING',
  PARTIALLY_DISPENSED = 'PARTIALLY_DISPENSED',
  DISPENSED = 'DISPENSED',
  CANCELLED = 'CANCELLED',
}

export interface IStockBatch {
  batchNumber: string;
  quantity: number;
  unitPrice: number;
  expiryDate: Date;
  receivedDate: Date;
}

export interface IMedication {
  hospitalId: Types.ObjectId;
  name: string;
  genericName?: string;
  category: MedicationCategory;
  unit: string; // e.g., 'tablets', 'bottles', 'vials', 'sachets'
  minReorderLevel: number;
  batches: IStockBatch[];
  totalQuantity: number;
  sellingPricePerUnit: number;
  requiresPrescription: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMedicationDocument extends IMedication, Document {
  _id: Types.ObjectId;
}

export interface IPrescriptionItem {
  medicationId: Types.ObjectId;
  medicationName: string;
  dosage: string; // e.g. "500mg"
  frequency: string; // e.g. "TDS (3x daily)"
  duration: string; // e.g. "5 days"
  quantityPrescribed: number;
  quantityDispensed: number;
  unitPrice: number;
  isDispensed: boolean;
}

export interface IPrescription {
  hospitalId: Types.ObjectId;
  prescriptionNumber: string;
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  ipdAdmissionId?: Types.ObjectId; // Optional link to IPD stay
  items: IPrescriptionItem[];
  status: PrescriptionStatus;
  notes?: string;
  dispensedBy?: Types.ObjectId; // Staff ID (Pharmacist)
  dispensedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPrescriptionDocument extends IPrescription, Document {
  _id: Types.ObjectId;
}

// --- DTOs ---

export interface CreateMedicationDTO {
  name: string;
  genericName?: string;
  category: MedicationCategory;
  unit: string;
  minReorderLevel?: number;
  sellingPricePerUnit: number;
  requiresPrescription?: boolean;
  initialStock?: {
    batchNumber: string;
    quantity: number;
    unitPrice: number;
    expiryDate: string;
  };
}

export interface AddStockBatchDTO {
  batchNumber: string;
  quantity: number;
  unitPrice: number;
  expiryDate: string;
}

export interface CreatePrescriptionItemDTO {
  medicationId: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantityPrescribed: number;
}

export interface CreatePrescriptionDTO {
  patientId: string;
  doctorId: string;
  ipdAdmissionId?: string;
  items: CreatePrescriptionItemDTO[];
  notes?: string;
}

export interface DispensePrescriptionDTO {
  items: {
    medicationId: string;
    quantityToDispense: number;
  }[];
  dispensedById: string;
}