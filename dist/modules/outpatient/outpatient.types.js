export var TriagePriority;
(function (TriagePriority) {
    TriagePriority["IMMEDIATE"] = "IMMEDIATE";
    TriagePriority["VERY_URGENT"] = "VERY_URGENT";
    TriagePriority["URGENT"] = "URGENT";
    TriagePriority["STANDARD"] = "STANDARD";
    TriagePriority["NON_URGENT"] = "NON_URGENT";
})(TriagePriority || (TriagePriority = {}));
export var ConsultationStatus;
(function (ConsultationStatus) {
    ConsultationStatus["IN_QUEUE"] = "IN_QUEUE";
    ConsultationStatus["WITH_NURSE"] = "WITH_NURSE";
    ConsultationStatus["WAITING_FOR_DOCTOR"] = "WAITING_FOR_DOCTOR";
    ConsultationStatus["IN_CONSULTATION"] = "IN_CONSULTATION";
    ConsultationStatus["COMPLETED"] = "COMPLETED";
    ConsultationStatus["CANCELLED"] = "CANCELLED";
})(ConsultationStatus || (ConsultationStatus = {}));
export var BillingCaptureStatus;
(function (BillingCaptureStatus) {
    BillingCaptureStatus["NOT_ATTEMPTED"] = "NOT_ATTEMPTED";
    BillingCaptureStatus["CAPTURED"] = "CAPTURED";
    BillingCaptureStatus["FAILED"] = "FAILED";
})(BillingCaptureStatus || (BillingCaptureStatus = {}));
export const OUTPATIENT_CONSULTATION_SERVICE_CODE = 'OUTPATIENT_CONSULTATION';
