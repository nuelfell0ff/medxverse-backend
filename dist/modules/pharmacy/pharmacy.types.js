/* =========================================================
   ENUMS
========================================================= */
export var DrugCategory;
(function (DrugCategory) {
    DrugCategory["ANTIBIOTICS"] = "ANTIBIOTICS";
    DrugCategory["ANALGESICS"] = "ANALGESICS";
    DrugCategory["ANTIHYPERTENSIVES"] = "ANTIHYPERTENSIVES";
    DrugCategory["ANTIDIABETICS"] = "ANTIDIABETICS";
    DrugCategory["VITAMINS"] = "VITAMINS";
    DrugCategory["ICU_CRITICAL"] = "ICU_CRITICAL";
    DrugCategory["OTHER"] = "OTHER";
})(DrugCategory || (DrugCategory = {}));
export var UnitOfMeasure;
(function (UnitOfMeasure) {
    UnitOfMeasure["TABLET"] = "TABLET";
    UnitOfMeasure["CAPSULE"] = "CAPSULE";
    UnitOfMeasure["VIAL"] = "VIAL";
    UnitOfMeasure["AMPOULE"] = "AMPOULE";
    UnitOfMeasure["BOTTLE"] = "BOTTLE";
    UnitOfMeasure["PACK"] = "PACK";
    UnitOfMeasure["PIECE"] = "PIECE";
})(UnitOfMeasure || (UnitOfMeasure = {}));
export var DispenseStatus;
(function (DispenseStatus) {
    DispenseStatus["PENDING"] = "PENDING";
    DispenseStatus["DISPENSED"] = "DISPENSED";
    DispenseStatus["PARTIALLY_DISPENSED"] = "PARTIALLY_DISPENSED";
    DispenseStatus["CANCELLED"] = "CANCELLED";
})(DispenseStatus || (DispenseStatus = {}));
/* =========================================================
   BILLING
========================================================= */
export var PharmacyBillingStatus;
(function (PharmacyBillingStatus) {
    PharmacyBillingStatus["NOT_ATTEMPTED"] = "NOT_ATTEMPTED";
    PharmacyBillingStatus["CAPTURED"] = "CAPTURED";
    PharmacyBillingStatus["PARTIAL"] = "PARTIAL";
    PharmacyBillingStatus["FAILED"] = "FAILED";
})(PharmacyBillingStatus || (PharmacyBillingStatus = {}));
