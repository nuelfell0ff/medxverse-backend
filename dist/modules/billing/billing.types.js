/* =========================================================
   ENUMS
========================================================= */
export var BillingAccountStatus;
(function (BillingAccountStatus) {
    BillingAccountStatus["ACTIVE"] = "ACTIVE";
    BillingAccountStatus["ON_HOLD"] = "ON_HOLD";
    BillingAccountStatus["CLOSED"] = "CLOSED";
})(BillingAccountStatus || (BillingAccountStatus = {}));
export var ChargeStatus;
(function (ChargeStatus) {
    ChargeStatus["PENDING"] = "PENDING";
    ChargeStatus["POSTED"] = "POSTED";
    ChargeStatus["PARTIALLY_PAID"] = "PARTIALLY_PAID";
    ChargeStatus["PAID"] = "PAID";
    ChargeStatus["VOIDED"] = "VOIDED";
    ChargeStatus["REFUNDED"] = "REFUNDED";
})(ChargeStatus || (ChargeStatus = {}));
export var ChargeCategory;
(function (ChargeCategory) {
    ChargeCategory["CONSULTATION"] = "CONSULTATION";
    ChargeCategory["LABORATORY"] = "LABORATORY";
    ChargeCategory["RADIOLOGY"] = "RADIOLOGY";
    ChargeCategory["PHARMACY"] = "PHARMACY";
    ChargeCategory["SURGERY"] = "SURGERY";
    ChargeCategory["ICU"] = "ICU";
    ChargeCategory["WARD"] = "WARD";
    ChargeCategory["EMERGENCY"] = "EMERGENCY";
    ChargeCategory["PROFESSIONAL_FEE"] = "PROFESSIONAL_FEE";
    ChargeCategory["ANAESTHESIA"] = "ANAESTHESIA";
    ChargeCategory["CONSUMABLE"] = "CONSUMABLE";
    ChargeCategory["IMPLANT"] = "IMPLANT";
    ChargeCategory["ACCOMMODATION"] = "ACCOMMODATION";
    ChargeCategory["MISCELLANEOUS"] = "MISCELLANEOUS";
})(ChargeCategory || (ChargeCategory = {}));
export var BillingSourceModule;
(function (BillingSourceModule) {
    BillingSourceModule["MANUAL"] = "MANUAL";
    BillingSourceModule["OUTPATIENT"] = "OUTPATIENT";
    BillingSourceModule["LABORATORY"] = "LABORATORY";
    BillingSourceModule["RADIOLOGY"] = "RADIOLOGY";
    BillingSourceModule["PHARMACY"] = "PHARMACY";
    BillingSourceModule["SURGERY"] = "SURGERY";
    BillingSourceModule["ICU"] = "ICU";
    BillingSourceModule["WARD"] = "WARD";
    BillingSourceModule["EMERGENCY"] = "EMERGENCY";
    BillingSourceModule["BED"] = "BED";
    BillingSourceModule["OTHER"] = "OTHER";
})(BillingSourceModule || (BillingSourceModule = {}));
export var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["CARD"] = "CARD";
    PaymentMethod["BANK_TRANSFER"] = "BANK_TRANSFER";
    PaymentMethod["ONLINE_GATEWAY"] = "ONLINE_GATEWAY";
    PaymentMethod["MOBILE_PAYMENT"] = "MOBILE_PAYMENT";
})(PaymentMethod || (PaymentMethod = {}));
export var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["CONFIRMED"] = "CONFIRMED";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["REVERSED"] = "REVERSED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
    PaymentStatus["PARTIALLY_REFUNDED"] = "PARTIALLY_REFUNDED";
})(PaymentStatus || (PaymentStatus = {}));
export var RefundStatus;
(function (RefundStatus) {
    RefundStatus["PENDING"] = "PENDING";
    RefundStatus["APPROVED"] = "APPROVED";
    RefundStatus["COMPLETED"] = "COMPLETED";
    RefundStatus["REJECTED"] = "REJECTED";
    RefundStatus["CANCELLED"] = "CANCELLED";
})(RefundStatus || (RefundStatus = {}));
export var PaymentPlanStatus;
(function (PaymentPlanStatus) {
    PaymentPlanStatus["ACTIVE"] = "ACTIVE";
    PaymentPlanStatus["COMPLETED"] = "COMPLETED";
    PaymentPlanStatus["OVERDUE"] = "OVERDUE";
    PaymentPlanStatus["CANCELLED"] = "CANCELLED";
})(PaymentPlanStatus || (PaymentPlanStatus = {}));
export var PaymentPlanFrequency;
(function (PaymentPlanFrequency) {
    PaymentPlanFrequency["WEEKLY"] = "WEEKLY";
    PaymentPlanFrequency["BIWEEKLY"] = "BIWEEKLY";
    PaymentPlanFrequency["MONTHLY"] = "MONTHLY";
    PaymentPlanFrequency["CUSTOM"] = "CUSTOM";
})(PaymentPlanFrequency || (PaymentPlanFrequency = {}));
export var ReconciliationStatus;
(function (ReconciliationStatus) {
    ReconciliationStatus["UNRECONCILED"] = "UNRECONCILED";
    ReconciliationStatus["RECONCILED"] = "RECONCILED";
    ReconciliationStatus["DISPUTED"] = "DISPUTED";
})(ReconciliationStatus || (ReconciliationStatus = {}));
/* =========================================================
   DEPARTMENT / SERVICE CODE NORMALIZATION
   ========================================================= */
/**
 * Canonical department keys used by Billing.
 *
 * `departmentName` is normalized to one of these keys when a catalogue
 * is created/updated. Service codes remain separate from department names.
 */
export const BILLING_DEPARTMENT_SERVICE_CODES = {
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
export const BILLING_DEPARTMENT_ALIASES = {
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
export function normalizeBillingDepartmentName(value) {
    if (!value?.trim())
        return undefined;
    const key = value
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_');
    return BILLING_DEPARTMENT_ALIASES[key] || key;
}
export function deriveBillingServiceCode(departmentName, suppliedCode) {
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
            const suppliedAsDepartment = normalizeBillingDepartmentName(supplied) === normalizedDepartment;
            if (suppliedAsDepartment) {
                return BILLING_DEPARTMENT_SERVICE_CODES[normalizedDepartment];
            }
        }
        return supplied;
    }
    if (!normalizedDepartment)
        return undefined;
    return BILLING_DEPARTMENT_SERVICE_CODES[normalizedDepartment];
}
