import { Types } from 'mongoose';

export enum BillingAccountStatus { ACTIVE='ACTIVE', ON_HOLD='ON_HOLD', CLOSED='CLOSED' }
export enum ChargeStatus { PENDING='PENDING', POSTED='POSTED', PARTIALLY_PAID='PARTIALLY_PAID', PAID='PAID', VOIDED='VOIDED', REFUNDED='REFUNDED' }
export enum ChargeCategory { CONSULTATION='CONSULTATION', LABORATORY='LABORATORY', RADIOLOGY='RADIOLOGY', PHARMACY='PHARMACY', SURGERY='SURGERY', ICU='ICU', WARD='WARD', EMERGENCY='EMERGENCY', PROFESSIONAL_FEE='PROFESSIONAL_FEE', ANAESTHESIA='ANAESTHESIA', CONSUMABLE='CONSUMABLE', IMPLANT='IMPLANT', ACCOMMODATION='ACCOMMODATION', MISCELLANEOUS='MISCELLANEOUS' }
export enum BillingSourceModule { MANUAL='MANUAL', OUTPATIENT='OUTPATIENT', LABORATORY='LABORATORY', RADIOLOGY='RADIOLOGY', PHARMACY='PHARMACY', SURGERY='SURGERY', ICU='ICU', WARD='WARD', EMERGENCY='EMERGENCY', BED='BED', OTHER='OTHER' }
export enum PaymentMethod { CASH='CASH', CARD='CARD', BANK_TRANSFER='BANK_TRANSFER', ONLINE_GATEWAY='ONLINE_GATEWAY', MOBILE_PAYMENT='MOBILE_PAYMENT' }
export enum PaymentStatus { PENDING='PENDING', CONFIRMED='CONFIRMED', FAILED='FAILED', REVERSED='REVERSED', REFUNDED='REFUNDED', PARTIALLY_REFUNDED='PARTIALLY_REFUNDED' }
export enum RefundStatus { PENDING='PENDING', APPROVED='APPROVED', COMPLETED='COMPLETED', REJECTED='REJECTED', CANCELLED='CANCELLED' }
export enum PaymentPlanStatus { ACTIVE='ACTIVE', COMPLETED='COMPLETED', OVERDUE='OVERDUE', CANCELLED='CANCELLED' }
export enum PaymentPlanFrequency { WEEKLY='WEEKLY', BIWEEKLY='BIWEEKLY', MONTHLY='MONTHLY', CUSTOM='CUSTOM' }
export enum ReconciliationStatus { UNRECONCILED='UNRECONCILED', RECONCILED='RECONCILED', DISPUTED='DISPUTED' }
export type IdLike = Types.ObjectId | string;
export interface CreateBillingAccountInput { hospitalId:IdLike; patientId:IdLike; accountName?:string; notes?:string }
export interface CreatePricingCatalogueItemInput { hospitalId:IdLike; code:string; name:string; category:ChargeCategory; departmentId?:IdLike; departmentName?:string; price:number; currency?:string; description?:string; effectiveFrom?:Date|string; effectiveTo?:Date|string }
export interface UpdatePricingCatalogueItemInput { code?:string; name?:string; category?:ChargeCategory; departmentId?:IdLike|null; departmentName?:string; price?:number; currency?:string; description?:string; effectiveFrom?:Date|string; effectiveTo?:Date|string|null; isActive?:boolean }
export interface CreateChargeInput { hospitalId:IdLike; patientId:IdLike; billingAccountId?:IdLike; catalogueItemId?:IdLike; serviceCode?:string; description:string; category:ChargeCategory; sourceModule?:BillingSourceModule; sourceId?:IdLike; departmentId?:IdLike; departmentName?:string; quantity?:number; unitPrice:number; discountAmount?:number; taxAmount?:number; notes?:string; chargedBy?:IdLike; chargeDate?:Date|string }
export interface CreatePaymentInput { hospitalId:IdLike; patientId:IdLike; billingAccountId?:IdLike; amount:number; method:PaymentMethod; reference?:string; provider?:string; providerTransactionId?:string; notes?:string; receivedBy?:IdLike; paidAt?:Date|string }
export interface CreateRefundInput { hospitalId:IdLike; patientId:IdLike; billingAccountId:IdLike; paymentId:IdLike; amount:number; reason:string; requestedBy?:IdLike }
export interface CreatePaymentPlanInput { hospitalId:IdLike; patientId:IdLike; billingAccountId:IdLike; totalAmount:number; installmentAmount:number; frequency:PaymentPlanFrequency; startDate:Date|string; endDate?:Date|string; notes?:string; createdBy?:IdLike }
export interface ReconcilePaymentInput { status:ReconciliationStatus; reconciledBy?:IdLike; reconciliationReference?:string; notes?:string }
export interface BillingListQuery { page?:number; limit?:number; search?:string; status?:string; category?:string; sourceModule?:string; paymentMethod?:string; paymentStatus?:string; startDate?:string; endDate?:string; patientId?:string; billingAccountId?:string }