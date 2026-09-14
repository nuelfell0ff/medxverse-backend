export var EDVisitStatus;
(function (EDVisitStatus) {
    EDVisitStatus["ARRIVED"] = "ARRIVED";
    EDVisitStatus["TRIAGED"] = "TRIAGED";
    EDVisitStatus["WAITING_FOR_BAY"] = "WAITING_FOR_BAY";
    EDVisitStatus["IN_BAY"] = "IN_BAY";
    EDVisitStatus["IN_TREATMENT"] = "IN_TREATMENT";
    EDVisitStatus["AWAITING_RESULTS"] = "AWAITING_RESULTS";
    EDVisitStatus["READY_FOR_DISPOSITION"] = "READY_FOR_DISPOSITION";
    EDVisitStatus["ADMITTED"] = "ADMITTED";
    EDVisitStatus["DISCHARGED"] = "DISCHARGED";
    EDVisitStatus["TRANSFERRED"] = "TRANSFERRED";
    EDVisitStatus["DECEASED"] = "DECEASED";
    EDVisitStatus["LEFT_WITHOUT_BEING_SEEN"] = "LEFT_WITHOUT_BEING_SEEN";
    EDVisitStatus["LEFT_AGAINST_MEDICAL_ADVICE"] = "LEFT_AGAINST_MEDICAL_ADVICE";
})(EDVisitStatus || (EDVisitStatus = {}));
export var TriageScale;
(function (TriageScale) {
    TriageScale["ESI"] = "ESI";
    TriageScale["CTAS"] = "CTAS";
})(TriageScale || (TriageScale = {}));
export var ArrivalMode;
(function (ArrivalMode) {
    ArrivalMode["AMBULANCE"] = "AMBULANCE";
    ArrivalMode["WALK_IN"] = "WALK_IN";
    ArrivalMode["POLICE"] = "POLICE";
    ArrivalMode["REFERRAL"] = "REFERRAL";
    ArrivalMode["OTHER"] = "OTHER";
})(ArrivalMode || (ArrivalMode = {}));
export var AcuityLevel;
(function (AcuityLevel) {
    AcuityLevel[AcuityLevel["LEVEL_1"] = 1] = "LEVEL_1";
    AcuityLevel[AcuityLevel["LEVEL_2"] = 2] = "LEVEL_2";
    AcuityLevel[AcuityLevel["LEVEL_3"] = 3] = "LEVEL_3";
    AcuityLevel[AcuityLevel["LEVEL_4"] = 4] = "LEVEL_4";
    AcuityLevel[AcuityLevel["LEVEL_5"] = 5] = "LEVEL_5";
})(AcuityLevel || (AcuityLevel = {}));
export var TraumaType;
(function (TraumaType) {
    TraumaType["NONE"] = "NONE";
    TraumaType["BLUNT"] = "BLUNT";
    TraumaType["PENETRATING"] = "PENETRATING";
    TraumaType["THERMAL"] = "THERMAL";
    TraumaType["CHEMICAL"] = "CHEMICAL";
    TraumaType["MULTI_SYSTEM"] = "MULTI_SYSTEM";
})(TraumaType || (TraumaType = {}));
export var BayAssignmentStatus;
(function (BayAssignmentStatus) {
    BayAssignmentStatus["ASSIGNED"] = "ASSIGNED";
    BayAssignmentStatus["RELEASED"] = "RELEASED";
    BayAssignmentStatus["CANCELLED"] = "CANCELLED";
})(BayAssignmentStatus || (BayAssignmentStatus = {}));
export var EDBayStatus;
(function (EDBayStatus) {
    EDBayStatus["AVAILABLE"] = "AVAILABLE";
    EDBayStatus["OCCUPIED"] = "OCCUPIED";
    EDBayStatus["CLEANING"] = "CLEANING";
    EDBayStatus["MAINTENANCE"] = "MAINTENANCE";
    EDBayStatus["RESERVED"] = "RESERVED";
})(EDBayStatus || (EDBayStatus = {}));
export var EDOrderType;
(function (EDOrderType) {
    EDOrderType["LAB"] = "LAB";
    EDOrderType["IMAGING"] = "IMAGING";
    EDOrderType["MEDICATION"] = "MEDICATION";
    EDOrderType["OTHER"] = "OTHER";
})(EDOrderType || (EDOrderType = {}));
export var EDOrderStatus;
(function (EDOrderStatus) {
    EDOrderStatus["ORDERED"] = "ORDERED";
    EDOrderStatus["IN_PROGRESS"] = "IN_PROGRESS";
    EDOrderStatus["COMPLETED"] = "COMPLETED";
    EDOrderStatus["CANCELLED"] = "CANCELLED";
    EDOrderStatus["RESULTED"] = "RESULTED";
})(EDOrderStatus || (EDOrderStatus = {}));
export var DispositionType;
(function (DispositionType) {
    DispositionType["ADMIT"] = "ADMIT";
    DispositionType["DISCHARGE"] = "DISCHARGE";
    DispositionType["TRANSFER"] = "TRANSFER";
    DispositionType["DECEASED"] = "DECEASED";
    DispositionType["LEFT_WITHOUT_BEING_SEEN"] = "LEFT_WITHOUT_BEING_SEEN";
    DispositionType["LEFT_AGAINST_MEDICAL_ADVICE"] = "LEFT_AGAINST_MEDICAL_ADVICE";
})(DispositionType || (DispositionType = {}));
export var WorkflowStatus;
(function (WorkflowStatus) {
    WorkflowStatus["PENDING"] = "PENDING";
    WorkflowStatus["TRIGGERED"] = "TRIGGERED";
    WorkflowStatus["COMPLETED"] = "COMPLETED";
    WorkflowStatus["FAILED"] = "FAILED";
})(WorkflowStatus || (WorkflowStatus = {}));
