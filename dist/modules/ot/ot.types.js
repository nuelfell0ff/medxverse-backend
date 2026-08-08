export var SurgeryStatus;
(function (SurgeryStatus) {
    SurgeryStatus["SCHEDULED"] = "SCHEDULED";
    SurgeryStatus["PREPPED"] = "PREPPED";
    SurgeryStatus["IN_PROGRESS"] = "IN_PROGRESS";
    SurgeryStatus["COMPLETED"] = "COMPLETED";
    SurgeryStatus["POSTPONED"] = "POSTPONED";
    SurgeryStatus["CANCELLED"] = "CANCELLED";
})(SurgeryStatus || (SurgeryStatus = {}));
export var SurgeryUrgency;
(function (SurgeryUrgency) {
    SurgeryUrgency["ELECTIVE"] = "ELECTIVE";
    SurgeryUrgency["URGENT"] = "URGENT";
    SurgeryUrgency["EMERGENCY"] = "EMERGENCY";
})(SurgeryUrgency || (SurgeryUrgency = {}));
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
