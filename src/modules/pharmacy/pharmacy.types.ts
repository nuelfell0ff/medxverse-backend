import { Document, Types } from 'mongoose';

/* =========================================================
   ENUMS
========================================================= */

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

/* =========================================================
   BILLING
========================================================= */

export enum PharmacyBillingStatus {
  NOT_ATTEMPTED = 'NOT_ATTEMPTED',
  CAPTURED = 'CAPTURED',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
}

/* =========================================================
   INVENTORY
========================================================= */

export interface IInventoryItem {
  hospitalId: Types.ObjectId;

  name: string;
  genericName?: string;

  category: DrugCategory;

  batchNumber: string;

  /**
   * Internal inventory/purchase price.
   *
   * This is NOT used as the patient's billing price when
   * centralized billing is enabled.
   */
  unitPrice: number;

  /**
   * Optional centralized Billing Pricing Catalogue code.
   *
   * Example:
   * PHARMACY_PARACETAMOL_500MG
   */
  billingCode?: string;

  /** Optional explicit centralized Billing Pricing Catalogue item. */
  pricingCatalogueItemId?: Types.ObjectId;

  quantityInStock: number;
  reorderLevel: number;

  unitOfMeasure: UnitOfMeasure;

  expiryDate: Date;

  isLowStock: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface IInventoryItemDocument
  extends IInventoryItem,
    Document {
  _id: Types.ObjectId;
}

/* =========================================================
   INVENTORY DTOs
========================================================= */

export interface CreateInventoryItemDTO {
  name: string;
  genericName?: string;

  category: DrugCategory;

  batchNumber: string;

  unitPrice: number;

  billingCode?: string;

  /** Optional explicit centralized Billing Pricing Catalogue item. */
  pricingCatalogueItemId?: string;

  quantityInStock: number;

  reorderLevel?: number;

  unitOfMeasure: UnitOfMeasure;

  expiryDate: string;
}

export interface UpdateStockDTO {
  quantityChange: number;
  reason?: string;
}

/* =========================================================
   DISPENSING
========================================================= */

export interface IDispenseItem {
  inventoryItemId: Types.ObjectId;

  quantity: number;

  /**
   * Snapshot of the internal pharmacy inventory price.
   *
   * This is preserved for pharmacy audit purposes.
   * Patient billing price comes from Billing.
   */
  unitPrice: number;

  totalPrice: number;

  /** Snapshot of the Billing Pricing Catalogue code used. */
  billingCode?: string;

  /** Explicit Billing Pricing Catalogue selected for this medicine. */
  pricingCatalogueItemId?: Types.ObjectId;

  /** Snapshot of the selected catalogue plan. */
  pricingCataloguePlanName?: string;

  pricingCataloguePrice?: number;

  pricingCatalogueCurrency?: string;

  pricingCatalogueVersion?: number;

  /**
   * Actual centralized billing charge created for this item.
   */
  billingChargeId?: Types.ObjectId;

  /**
   * Price resolved from Billing.
   */
  billingUnitPrice?: number;

  /**
   * Currency returned by Billing.
   */
  billingCurrency?: string;

  /**
   * Pricing catalogue version used.
   */
  billingCatalogueVersion?: number;

  /**
   * Billing error for this individual item, if any.
   */
  billingError?: string;
}

export interface IDispenseItemDTO {
  inventoryItemId: string;
  quantity: number;
  /** Optional explicit Billing Pricing Catalogue selected on the Pharmacy UI. */
  pricingCatalogueItemId?: string;
}

export interface IDispenseRecord {
  hospitalId: Types.ObjectId;

  patientId: Types.ObjectId;

  consultationId?: Types.ObjectId;

  dispensedBy: Types.ObjectId;

  items: IDispenseItem[];

  /**
   * Internal pharmacy inventory total.
   */
  totalAmount: number;

  status: DispenseStatus;

  notes?: string;

  /* =====================================================
     BILLING
  ===================================================== */

  billingStatus: PharmacyBillingStatus;

  billingChargeIds: Types.ObjectId[];

  billingErrors: string[];

  billingCapturedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface IDispenseRecordDocument
  extends IDispenseRecord,
    Document {
  _id: Types.ObjectId;
}

/* =========================================================
   DISPENSE DTO
========================================================= */

export interface CreateDispenseRecordDTO {
  patientId: string;

  consultationId?: string;

  items: IDispenseItemDTO[];

  notes?: string;
}

/* =========================================================
   QUERY DTOs
========================================================= */

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

  billingStatus?: PharmacyBillingStatus;

  page?: string;

  limit?: string;
}