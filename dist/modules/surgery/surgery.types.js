export var SurgeryStatus;
(function (SurgeryStatus) {
    SurgeryStatus["SCHEDULED"] = "SCHEDULED";
    SurgeryStatus["PRE_OP_PREPARATION"] = "PRE_OP_PREPARATION";
    SurgeryStatus["READY_FOR_THEATRE"] = "READY_FOR_THEATRE";
    SurgeryStatus["IN_PROGRESS"] = "IN_PROGRESS";
    SurgeryStatus["RECOVERY"] = "RECOVERY";
    SurgeryStatus["COMPLETED"] = "COMPLETED";
    SurgeryStatus["CANCELLED"] = "CANCELLED";
    SurgeryStatus["POSTPONED"] = "POSTPONED";
})(SurgeryStatus || (SurgeryStatus = {}));
export var UrgencyLevel;
(function (UrgencyLevel) {
    UrgencyLevel["ELECTIVE"] = "ELECTIVE";
    UrgencyLevel["URGENT"] = "URGENT";
    UrgencyLevel["EMERGENCY"] = "EMERGENCY";
})(UrgencyLevel || (UrgencyLevel = {}));
export var AnesthesiaType;
(function (AnesthesiaType) {
    AnesthesiaType["GENERAL"] = "GENERAL";
    AnesthesiaType["REGIONAL"] = "REGIONAL";
    AnesthesiaType["LOCAL"] = "LOCAL";
    AnesthesiaType["SPINAL"] = "SPINAL";
    AnesthesiaType["EPIDURAL"] = "EPIDURAL";
    AnesthesiaType["SEDATION"] = "SEDATION";
    AnesthesiaType["COMBINED"] = "COMBINED";
})(AnesthesiaType || (AnesthesiaType = {}));
export var SurgicalRole;
(function (SurgicalRole) {
    SurgicalRole["PRIMARY_SURGEON"] = "PRIMARY_SURGEON";
    SurgicalRole["ASSISTING_SURGEON"] = "ASSISTING_SURGEON";
    SurgicalRole["ANAESTHETIST"] = "ANAESTHETIST";
    SurgicalRole["SCRUB_NURSE"] = "SCRUB_NURSE";
    SurgicalRole["CIRCULATING_NURSE"] = "CIRCULATING_NURSE";
    SurgicalRole["THEATRE_TECHNICIAN"] = "THEATRE_TECHNICIAN";
})(SurgicalRole || (SurgicalRole = {}));
export var ASAClassification;
(function (ASAClassification) {
    ASAClassification["ASA_1"] = "ASA_1";
    ASAClassification["ASA_2"] = "ASA_2";
    ASAClassification["ASA_3"] = "ASA_3";
    ASAClassification["ASA_4"] = "ASA_4";
    ASAClassification["ASA_5"] = "ASA_5";
    ASAClassification["ASA_6"] = "ASA_6";
    ASAClassification["ASA_E"] = "ASA_E";
})(ASAClassification || (ASAClassification = {}));
export var SterilizationStatus;
(function (SterilizationStatus) {
    SterilizationStatus["STERILE"] = "STERILE";
    SterilizationStatus["PENDING"] = "PENDING";
    SterilizationStatus["EXPIRED"] = "EXPIRED";
})(SterilizationStatus || (SterilizationStatus = {}));
export var ConsentType;
(function (ConsentType) {
    ConsentType["PROCEDURE"] = "PROCEDURE";
    ConsentType["ANESTHESIA"] = "ANESTHESIA";
    ConsentType["BLOOD_TRANSFUSION"] = "BLOOD_TRANSFUSION";
    ConsentType["HIGH_RISK"] = "HIGH_RISK";
    ConsentType["ADDITIONAL_PROCEDURE"] = "ADDITIONAL_PROCEDURE";
})(ConsentType || (ConsentType = {}));
export var MedicationStatus;
(function (MedicationStatus) {
    MedicationStatus["PLANNED"] = "PLANNED";
    MedicationStatus["ADMINISTERED"] = "ADMINISTERED";
    MedicationStatus["HELD"] = "HELD";
    MedicationStatus["CANCELLED"] = "CANCELLED";
})(MedicationStatus || (MedicationStatus = {}));
export var EquipmentStatus;
(function (EquipmentStatus) {
    EquipmentStatus["AVAILABLE"] = "AVAILABLE";
    EquipmentStatus["IN_USE"] = "IN_USE";
    EquipmentStatus["MAINTENANCE"] = "MAINTENANCE";
    EquipmentStatus["UNAVAILABLE"] = "UNAVAILABLE";
})(EquipmentStatus || (EquipmentStatus = {}));
