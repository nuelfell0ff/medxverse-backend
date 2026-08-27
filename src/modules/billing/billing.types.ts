import { Types } from 'mongoose';

/* =========================================================
   ENUMS
========================================================= */

export enum BillingAccountStatus {
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  CLOSED = 'CLOSED',
}

export enum ChargeStatus {
  PENDING = 'PENDING',
  POSTED = 'POSTED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  VOIDED = 'VOIDED',
  REFUNDED = 'REFUNDED',
}

export enum ChargeCategory {
  CONSULTATION = 'CONSULTATION',
  LABORATORY = 'LABORATORY',
  RADIOLOGY = 'RADIOLOGY',
  PHARMACY = 'PHARMACY',
  SURGERY = 'SURGERY',
  ICU = 'ICU',
  WARD = 'WARD',
  EMERGENCY = 'EMERGENCY',
  PROFESSIONAL_FEE = 'PROFESSIONAL_FEE',
  ANAESTHESIA = 'ANAESTHESIA',
  CONSUMABLE = 'CONSUMABLE',
  IMPLANT = 'IMPLANT',
  ACCOMMODATION = 'ACCOMMODATION',
  MISCELLANEOUS = 'MISCELLANEOUS',
}

export enum BillingSourceModule {
  MANUAL = 'MANUAL',
  OUTPATIENT = 'OUTPATIENT',
  LABORATORY = 'LABORATORY',
  RADIOLOGY = 'RADIOLOGY',
  PHARMACY = 'PHARMACY',
  SURGERY = 'SURGERY',
  ICU = 'ICU',
  WARD = 'WARD',
  EMERGENCY = 'EMERGENCY',
  BED = 'BED',
  OTHER = 'OTHER',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  ONLINE_GATEWAY = 'ONLINE_GATEWAY',
  MOBILE_PAYMENT = 'MOBILE_PAYMENT',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum RefundStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentPlanStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum PaymentPlanFrequency {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM',
}

export enum ReconciliationStatus {
  UNRECONCILED = 'UNRECONCILED',
  RECONCILED = 'RECONCILED',
  DISPUTED = 'DISPUTED',
}

export type IdLike = Types.ObjectId | string;

/* =========================================================
   DEPARTMENT / SERVICE CODE NORMALIZATION
   ========================================================= */

/**
 * Canonical department keys used by Billing.
 *
 * `departmentName` is normalized to one of these keys when a catalogue
 * is created/updated. Service codes remain separate from department names.
 */
export const BILLING_DEPARTMENT_SERVICE_CODES: Record<string, string> = {
  OUTPATIENT: 'OUTPATIENT_CONSULTATION',
  SURGERY: 'SURGERY_PROCEDURE',
  RADIOLOGY: 'RADIOLOGY_PROCEDURE',
  LABORATORY: 'LAB_TEST',
  PHARMACY: 'PHARMACY_SERVICE',
  ICU: 'ICU_SERVICE',
  WARD: 'WARD_SERVICE',
  EMERGENCY: 'EMERGENCY_SERVICE',
};

/**
 * Human/user-entered aliases -> canonical department key.
 * This is intentionally centralized so every catalogue follows the
 * same department naming rules.
 */
export const BILLING_DEPARTMENT_ALIASES: Record<string, string> = {
  OUTPATIENT: 'OUTPATIENT',
  OUTPATIENTS: 'OUTPATIENT',
  OPD: 'OUTPATIENT',

  SURGERY: 'SURGERY',
  SURGICAL: 'SURGERY',

  RADIOLOGY: 'RADIOLOGY',
  RADIOLOGICAL: 'RADIOLOGY',
  RADIO: 'RADIOLOGY',

  LAB: 'LABORATORY',
  LABS: 'LABORATORY',
  LABORATORY: 'LABORATORY',

  PHARMACY: 'PHARMACY',
  ICU: 'ICU',
  WARD: 'WARD',

  EMERGENCY: 'EMERGENCY',
  ER: 'EMERGENCY',
  ED: 'EMERGENCY',
};

export function normalizeBillingDepartmentName(
  value?: string | null
): string | undefined {
  if (!value?.trim()) return undefined;

  const key = value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  return BILLING_DEPARTMENT_ALIASES[key] || key;
}

export function deriveBillingServiceCode(
  departmentName?: string | null,
  suppliedCode?: string | null
): string | undefined {
  const normalizedDepartment = normalizeBillingDepartmentName(departmentName);

  /*
   * Explicit non-alias/custom service codes remain authoritative.
   * This prevents existing specialised catalogue items from being
   * silently renamed.
   */
  if (suppliedCode?.trim()) {
    const supplied = suppliedCode.trim().toUpperCase();

    /*
     * If the supplied value is merely the raw department name/alias,
     * replace it with the canonical department service code.
     */
    if (normalizedDepartment) {
      const suppliedAsDepartment =
        normalizeBillingDepartmentName(supplied) === normalizedDepartment;

      if (suppliedAsDepartment) {
        return BILLING_DEPARTMENT_SERVICE_CODES[normalizedDepartment];
      }
    }

    return supplied;
  }

  if (!normalizedDepartment) return undefined;

  return BILLING_DEPARTMENT_SERVICE_CODES[normalizedDepartment];
}


export interface CreateBillingAccountInput {
  hospitalId: IdLike;
  patientId: IdLike;
  accountName?: string;
  notes?: string;
}

export interface CreatePricingCatalogueItemInput {
  hospitalId: IdLike;
  code?: string;
  name: string;
  planName?: string;
  category: ChargeCategory;
  departmentId?: IdLike;
  departmentName?: string;
  price: number;
  currency?: string;
  description?: string;
  effectiveFrom?: Date | string;
  effectiveTo?: Date | string;
}

export interface UpdatePricingCatalogueItemInput {
  code?: string;
  name?: string;
  planName?: string;
  category?: ChargeCategory;
  departmentId?: IdLike | null;
  departmentName?: string;
  price?: number;
  currency?: string;
  description?: string;
  effectiveFrom?: Date | string;
  effectiveTo?: Date | string | null;
  isActive?: boolean;
}

export interface ResolvePriceInput {
  hospitalId: IdLike;
  code: string;
  catalogueItemId?: IdLike;
  departmentId?: IdLike;
  departmentName?: string;
  category?: ChargeCategory;
  serviceDate?: Date | string;
}

export interface CreateChargeInput {
  hospitalId: IdLike;
  patientId: IdLike;
  billingAccountId?: IdLike;

  /** Explicit pricing catalogue selected by the clinical module. */
  catalogueItemId?: IdLike;
  serviceCode?: string;

  description: string;
  category: ChargeCategory;
  sourceModule?: BillingSourceModule;
  sourceId?: IdLike;

  departmentId?: IdLike;
  departmentName?: string;

  quantity?: number;

  /**
   * Required only for manual charges or when intentionally overriding
   * the resolved catalogue price.
   */
  unitPrice?: number;
  overridePrice?: number;
  overrideReason?: string;

  discountAmount?: number;
  taxAmount?: number;
  notes?: string;

  chargedBy?: IdLike;
  chargeDate?: Date | string;
}

export interface CreatePaymentInput {
  hospitalId: IdLike;
  patientId: IdLike;
  billingAccountId?: IdLike;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  provider?: string;
  providerTransactionId?: string;
  notes?: string;
  receivedBy?: IdLike;
  paidAt?: Date | string;
}

export interface CreateRefundInput {
  hospitalId: IdLike;
  patientId: IdLike;
  billingAccountId: IdLike;
  paymentId: IdLike;
  amount: number;
  reason: string;
  requestedBy?: IdLike;
}

export interface CreatePaymentPlanInput {
  hospitalId: IdLike;
  patientId: IdLike;
  billingAccountId: IdLike;
  totalAmount: number;
  installmentAmount: number;
  frequency: PaymentPlanFrequency;
  startDate: Date | string;
  endDate?: Date | string;
  notes?: string;
  createdBy?: IdLike;
}

export interface ReconcilePaymentInput {
  status: ReconciliationStatus;
  reconciledBy?: IdLike;
  reconciliationReference?: string;
  notes?: string;
}

export interface BillingListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  category?: string;
  sourceModule?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  reconciliationStatus?: string;
  startDate?: string;
  endDate?: string;
  patientId?: string;
  billingAccountId?: string;
  departmentId?: string;
  departmentName?: string;
  code?: string;
  planName?: string;
  activeOnly?: string | boolean;
}

export interface PriceResolutionResult {
  catalogueItemId: Types.ObjectId;
  code: string;
  name: string;
  planName?: string;
  category: ChargeCategory;
  departmentId?: Types.ObjectId;
  departmentName?: string;
  price: number;
  currency: string;
  version: number;
  effectiveFrom?: Date;
  effectiveTo?: Date;
}