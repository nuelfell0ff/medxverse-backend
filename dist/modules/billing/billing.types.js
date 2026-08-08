export var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["CARD"] = "CARD";
    PaymentMethod["BANK_TRANSFER"] = "BANK_TRANSFER";
    PaymentMethod["INSURANCE"] = "INSURANCE";
    PaymentMethod["MOBILE_MONEY"] = "MOBILE_MONEY";
    PaymentMethod["OTHER"] = "OTHER";
})(PaymentMethod || (PaymentMethod = {}));
export var InvoiceStatus;
(function (InvoiceStatus) {
    InvoiceStatus["PENDING"] = "PENDING";
    InvoiceStatus["PARTIALLY_PAID"] = "PARTIALLY_PAID";
    InvoiceStatus["PAID"] = "PAID";
    InvoiceStatus["REFUNDED"] = "REFUNDED";
    InvoiceStatus["CANCELLED"] = "CANCELLED";
})(InvoiceStatus || (InvoiceStatus = {}));
export var LineItemCategory;
(function (LineItemCategory) {
    LineItemCategory["CONSULTATION"] = "CONSULTATION";
    LineItemCategory["LABORATORY"] = "LABORATORY";
    LineItemCategory["RADIOLOGY"] = "RADIOLOGY";
    LineItemCategory["PHARMACY"] = "PHARMACY";
    LineItemCategory["SURGERY"] = "SURGERY";
    LineItemCategory["BED_CHARGE"] = "BED_CHARGE";
    LineItemCategory["PROCEDURE"] = "PROCEDURE";
    LineItemCategory["MISCELLANEOUS"] = "MISCELLANEOUS";
})(LineItemCategory || (LineItemCategory = {}));
