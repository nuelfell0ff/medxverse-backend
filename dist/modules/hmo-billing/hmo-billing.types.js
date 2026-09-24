export var InvoiceType;
(function (InvoiceType) {
    InvoiceType["MEMBER_PREMIUM"] = "MEMBER_PREMIUM";
    InvoiceType["CORPORATE_PREMIUM"] = "CORPORATE_PREMIUM";
    InvoiceType["OTHER"] = "OTHER";
})(InvoiceType || (InvoiceType = {}));
export var InvoiceStatus;
(function (InvoiceStatus) {
    InvoiceStatus["DRAFT"] = "DRAFT";
    InvoiceStatus["ISSUED"] = "ISSUED";
    InvoiceStatus["PARTIALLY_PAID"] = "PARTIALLY_PAID";
    InvoiceStatus["PAID"] = "PAID";
    InvoiceStatus["OVERDUE"] = "OVERDUE";
    InvoiceStatus["CANCELLED"] = "CANCELLED";
})(InvoiceStatus || (InvoiceStatus = {}));
export var PaymentType;
(function (PaymentType) {
    PaymentType["PREMIUM"] = "PREMIUM";
    PaymentType["PROVIDER_SETTLEMENT"] = "PROVIDER_SETTLEMENT";
    PaymentType["REFUND"] = "REFUND";
    PaymentType["OTHER"] = "OTHER";
})(PaymentType || (PaymentType = {}));
export var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["BANK_TRANSFER"] = "BANK_TRANSFER";
    PaymentMethod["CARD"] = "CARD";
    PaymentMethod["USSD"] = "USSD";
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["DIRECT_DEBIT"] = "DIRECT_DEBIT";
    PaymentMethod["MOBILE_MONEY"] = "MOBILE_MONEY";
    PaymentMethod["OTHER"] = "OTHER";
})(PaymentMethod || (PaymentMethod = {}));
export var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["PROCESSING"] = "PROCESSING";
    PaymentStatus["SUCCESS"] = "SUCCESS";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["REVERSED"] = "REVERSED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
})(PaymentStatus || (PaymentStatus = {}));
export var SettlementType;
(function (SettlementType) {
    SettlementType["FEE_FOR_SERVICE"] = "FEE_FOR_SERVICE";
    SettlementType["CAPITATION"] = "CAPITATION";
    SettlementType["OTHER"] = "OTHER";
})(SettlementType || (SettlementType = {}));
export var SettlementStatus;
(function (SettlementStatus) {
    SettlementStatus["DRAFT"] = "DRAFT";
    SettlementStatus["READY"] = "READY";
    SettlementStatus["APPROVED"] = "APPROVED";
    SettlementStatus["PARTIALLY_PAID"] = "PARTIALLY_PAID";
    SettlementStatus["PAID"] = "PAID";
    SettlementStatus["DISPUTED"] = "DISPUTED";
    SettlementStatus["CANCELLED"] = "CANCELLED";
})(SettlementStatus || (SettlementStatus = {}));
export var ReconciliationStatus;
(function (ReconciliationStatus) {
    ReconciliationStatus["OPEN"] = "OPEN";
    ReconciliationStatus["MATCHED"] = "MATCHED";
    ReconciliationStatus["PARTIAL"] = "PARTIAL";
    ReconciliationStatus["DISPUTED"] = "DISPUTED";
    ReconciliationStatus["RESOLVED"] = "RESOLVED";
})(ReconciliationStatus || (ReconciliationStatus = {}));
