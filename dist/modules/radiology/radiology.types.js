export var ImagingModality;
(function (ImagingModality) {
    ImagingModality["XRAY"] = "XRAY";
    ImagingModality["CT"] = "CT";
    ImagingModality["MRI"] = "MRI";
    ImagingModality["ULTRASOUND"] = "ULTRASOUND";
    ImagingModality["MAMMOGRAPHY"] = "MAMMOGRAPHY";
    ImagingModality["FLUOROSCOPY"] = "FLUOROSCOPY";
    ImagingModality["NUCLEAR_MEDICINE"] = "NUCLEAR_MEDICINE";
    ImagingModality["PET"] = "PET";
    ImagingModality["INTERVENTIONAL"] = "INTERVENTIONAL";
    ImagingModality["OTHER"] = "OTHER";
})(ImagingModality || (ImagingModality = {}));
export var RadiologyOrderStatus;
(function (RadiologyOrderStatus) {
    RadiologyOrderStatus["REQUESTED"] = "REQUESTED";
    RadiologyOrderStatus["SCHEDULED"] = "SCHEDULED";
    RadiologyOrderStatus["PATIENT_ARRIVED"] = "PATIENT_ARRIVED";
    RadiologyOrderStatus["PREPARING"] = "PREPARING";
    RadiologyOrderStatus["READY_FOR_EXAM"] = "READY_FOR_EXAM";
    RadiologyOrderStatus["IN_PROGRESS"] = "IN_PROGRESS";
    RadiologyOrderStatus["IMAGE_ACQUISITION_COMPLETE"] = "IMAGE_ACQUISITION_COMPLETE";
    RadiologyOrderStatus["REPORTING"] = "REPORTING";
    RadiologyOrderStatus["REPORTED"] = "REPORTED";
    RadiologyOrderStatus["COMPLETED"] = "COMPLETED";
    RadiologyOrderStatus["CANCELLED"] = "CANCELLED";
})(RadiologyOrderStatus || (RadiologyOrderStatus = {}));
export var PriorityLevel;
(function (PriorityLevel) {
    PriorityLevel["STAT"] = "STAT";
    PriorityLevel["URGENT"] = "URGENT";
    PriorityLevel["ROUTINE"] = "ROUTINE";
})(PriorityLevel || (PriorityLevel = {}));
export var AssignmentRole;
(function (AssignmentRole) {
    AssignmentRole["RADIOLOGIST"] = "RADIOLOGIST";
    AssignmentRole["RADIOGRAPHER"] = "RADIOGRAPHER";
    AssignmentRole["TECHNOLOGIST"] = "TECHNOLOGIST";
    AssignmentRole["NURSE"] = "NURSE";
    AssignmentRole["ADMIN"] = "ADMIN";
})(AssignmentRole || (AssignmentRole = {}));
export var ExaminationQueueStatus;
(function (ExaminationQueueStatus) {
    ExaminationQueueStatus["WAITING"] = "WAITING";
    ExaminationQueueStatus["IN_PROGRESS"] = "IN_PROGRESS";
    ExaminationQueueStatus["COMPLETED"] = "COMPLETED";
    ExaminationQueueStatus["CANCELLED"] = "CANCELLED";
    ExaminationQueueStatus["ON_HOLD"] = "ON_HOLD";
})(ExaminationQueueStatus || (ExaminationQueueStatus = {}));
export var ReportStatus;
(function (ReportStatus) {
    ReportStatus["DRAFT"] = "DRAFT";
    ReportStatus["FINAL"] = "FINAL";
    ReportStatus["AMENDED"] = "AMENDED";
})(ReportStatus || (ReportStatus = {}));
export var CriticalResultStatus;
(function (CriticalResultStatus) {
    CriticalResultStatus["NOT_APPLICABLE"] = "NOT_APPLICABLE";
    CriticalResultStatus["PENDING"] = "PENDING";
    CriticalResultStatus["NOTIFIED"] = "NOTIFIED";
    CriticalResultStatus["ACKNOWLEDGED"] = "ACKNOWLEDGED";
})(CriticalResultStatus || (CriticalResultStatus = {}));
export var PregnancyScreeningStatus;
(function (PregnancyScreeningStatus) {
    PregnancyScreeningStatus["NOT_REQUIRED"] = "NOT_REQUIRED";
    PregnancyScreeningStatus["PENDING"] = "PENDING";
    PregnancyScreeningStatus["NEGATIVE"] = "NEGATIVE";
    PregnancyScreeningStatus["POSITIVE"] = "POSITIVE";
    PregnancyScreeningStatus["UNKNOWN"] = "UNKNOWN";
})(PregnancyScreeningStatus || (PregnancyScreeningStatus = {}));
export var ContrastStatus;
(function (ContrastStatus) {
    ContrastStatus["NOT_REQUIRED"] = "NOT_REQUIRED";
    ContrastStatus["PLANNED"] = "PLANNED";
    ContrastStatus["ADMINISTERED"] = "ADMINISTERED";
    ContrastStatus["DECLINED"] = "DECLINED";
    ContrastStatus["CONTRAINDICATED"] = "CONTRAINDICATED";
})(ContrastStatus || (ContrastStatus = {}));
export var AIStudyPriority;
(function (AIStudyPriority) {
    AIStudyPriority["NOT_PROCESSED"] = "NOT_PROCESSED";
    AIStudyPriority["LOW"] = "LOW";
    AIStudyPriority["MEDIUM"] = "MEDIUM";
    AIStudyPriority["HIGH"] = "HIGH";
    AIStudyPriority["CRITICAL"] = "CRITICAL";
})(AIStudyPriority || (AIStudyPriority = {}));
export var RadiologyBillingStatus;
(function (RadiologyBillingStatus) {
    RadiologyBillingStatus["NOT_ATTEMPTED"] = "NOT_ATTEMPTED";
    RadiologyBillingStatus["CAPTURED"] = "CAPTURED";
    RadiologyBillingStatus["PARTIAL"] = "PARTIAL";
    RadiologyBillingStatus["FAILED"] = "FAILED";
})(RadiologyBillingStatus || (RadiologyBillingStatus = {}));
