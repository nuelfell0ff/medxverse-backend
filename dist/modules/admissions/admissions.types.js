export var BedType;
(function (BedType) {
    BedType["GENERAL"] = "GENERAL";
    BedType["SEMI_PRIVATE"] = "SEMI_PRIVATE";
    BedType["PRIVATE"] = "PRIVATE";
    BedType["ICU"] = "ICU";
    BedType["HDU"] = "HDU";
    BedType["ISOLATION"] = "ISOLATION";
})(BedType || (BedType = {}));
export var BedStatus;
(function (BedStatus) {
    BedStatus["AVAILABLE"] = "AVAILABLE";
    BedStatus["OCCUPIED"] = "OCCUPIED";
    BedStatus["MAINTENANCE"] = "MAINTENANCE";
    BedStatus["RESERVED"] = "RESERVED";
})(BedStatus || (BedStatus = {}));
export var AdmissionStatus;
(function (AdmissionStatus) {
    AdmissionStatus["ADMITTED"] = "ADMITTED";
    AdmissionStatus["TRANSFERRED"] = "TRANSFERRED";
    AdmissionStatus["DISCHARGED"] = "DISCHARGED";
    AdmissionStatus["CANCELLED"] = "CANCELLED";
})(AdmissionStatus || (AdmissionStatus = {}));
