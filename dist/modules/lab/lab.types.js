/* =========================================================
   ENUMS
========================================================= */
export var LabOrderStatus;
(function (LabOrderStatus) {
    LabOrderStatus["PENDING"] = "PENDING";
    LabOrderStatus["SAMPLE_SCHEDULED"] = "SAMPLE_SCHEDULED";
    LabOrderStatus["SAMPLE_COLLECTED"] = "SAMPLE_COLLECTED";
    LabOrderStatus["SPECIMEN_RECEIVED"] = "SPECIMEN_RECEIVED";
    LabOrderStatus["IN_PROGRESS"] = "IN_PROGRESS";
    LabOrderStatus["RESULTS_RECORDED"] = "RESULTS_RECORDED";
    LabOrderStatus["VERIFIED"] = "VERIFIED";
    LabOrderStatus["AUTHORIZED"] = "AUTHORIZED";
    LabOrderStatus["COMPLETED"] = "COMPLETED";
    LabOrderStatus["SAMPLE_REJECTED"] = "SAMPLE_REJECTED";
    LabOrderStatus["RECOLLECTION_REQUIRED"] = "RECOLLECTION_REQUIRED";
    LabOrderStatus["CANCELLED"] = "CANCELLED";
})(LabOrderStatus || (LabOrderStatus = {}));
export var LabBillingStatus;
(function (LabBillingStatus) {
    LabBillingStatus["NOT_ATTEMPTED"] = "NOT_ATTEMPTED";
    LabBillingStatus["CAPTURED"] = "CAPTURED";
    LabBillingStatus["FAILED"] = "FAILED";
})(LabBillingStatus || (LabBillingStatus = {}));
export var LabPriority;
(function (LabPriority) {
    LabPriority["ROUTINE"] = "ROUTINE";
    LabPriority["URGENT"] = "URGENT";
    LabPriority["STAT"] = "STAT";
})(LabPriority || (LabPriority = {}));
export var LabDepartment;
(function (LabDepartment) {
    LabDepartment["HAEMATOLOGY"] = "HAEMATOLOGY";
    LabDepartment["CLINICAL_CHEMISTRY"] = "CLINICAL_CHEMISTRY";
    LabDepartment["MICROBIOLOGY"] = "MICROBIOLOGY";
    LabDepartment["PARASITOLOGY"] = "PARASITOLOGY";
    LabDepartment["IMMUNOLOGY_SEROLOGY"] = "IMMUNOLOGY_SEROLOGY";
    LabDepartment["HISTOPATHOLOGY"] = "HISTOPATHOLOGY";
    LabDepartment["CYTOLOGY"] = "CYTOLOGY";
    LabDepartment["MOLECULAR_DIAGNOSTICS"] = "MOLECULAR_DIAGNOSTICS";
    LabDepartment["BLOOD_BANK"] = "BLOOD_BANK";
    LabDepartment["GENETICS"] = "GENETICS";
})(LabDepartment || (LabDepartment = {}));
export var ResultFlag;
(function (ResultFlag) {
    ResultFlag["NORMAL"] = "NORMAL";
    ResultFlag["ABNORMAL"] = "ABNORMAL";
    ResultFlag["CRITICAL"] = "CRITICAL";
    ResultFlag["DELTA_CHECK_WARNING"] = "DELTA_CHECK_WARNING";
})(ResultFlag || (ResultFlag = {}));
export var SpecimenQuality;
(function (SpecimenQuality) {
    SpecimenQuality["SATISFACTORY"] = "SATISFACTORY";
    SpecimenQuality["HEMOLYZED"] = "HEMOLYZED";
    SpecimenQuality["LIPEMIC"] = "LIPEMIC";
    SpecimenQuality["CLOTTED"] = "CLOTTED";
    SpecimenQuality["INSUFFICIENT_VOLUME"] = "INSUFFICIENT_VOLUME";
    SpecimenQuality["CONTAMINATED"] = "CONTAMINATED";
    SpecimenQuality["LEAKING"] = "LEAKING";
    SpecimenQuality["IMPROPERLY_LABELED"] = "IMPROPERLY_LABELED";
    SpecimenQuality["DELAYED_TRANSPORT"] = "DELAYED_TRANSPORT";
})(SpecimenQuality || (SpecimenQuality = {}));
export var EntryMethod;
(function (EntryMethod) {
    EntryMethod["MANUAL"] = "MANUAL";
    EntryMethod["ANALYZER_AUTOMATED"] = "ANALYZER_AUTOMATED";
    EntryMethod["AI_PATTERN"] = "AI_PATTERN";
    EntryMethod["IMPORTED"] = "IMPORTED";
})(EntryMethod || (EntryMethod = {}));
export var SampleRoutingStatus;
(function (SampleRoutingStatus) {
    SampleRoutingStatus["PENDING"] = "PENDING";
    SampleRoutingStatus["ROUTED"] = "ROUTED";
    SampleRoutingStatus["RECEIVED_BY_SECTION"] = "RECEIVED_BY_SECTION";
    SampleRoutingStatus["IN_ANALYSIS"] = "IN_ANALYSIS";
    SampleRoutingStatus["COMPLETED"] = "COMPLETED";
})(SampleRoutingStatus || (SampleRoutingStatus = {}));
export var AuthorizationLevel;
(function (AuthorizationLevel) {
    AuthorizationLevel["TECHNICIAN"] = "TECHNICIAN";
    AuthorizationLevel["VERIFIER"] = "VERIFIER";
    AuthorizationLevel["SENIOR_SCIENTIST"] = "SENIOR_SCIENTIST";
    AuthorizationLevel["PATHOLOGIST"] = "PATHOLOGIST";
    AuthorizationLevel["LAB_DIRECTOR"] = "LAB_DIRECTOR";
})(AuthorizationLevel || (AuthorizationLevel = {}));
