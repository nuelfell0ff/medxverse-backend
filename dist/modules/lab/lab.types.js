export var LabOrderStatus;
(function (LabOrderStatus) {
    LabOrderStatus["PENDING"] = "PENDING";
    LabOrderStatus["SAMPLE_COLLECTED"] = "SAMPLE_COLLECTED";
    LabOrderStatus["IN_PROGRESS"] = "IN_PROGRESS";
    LabOrderStatus["COMPLETED"] = "COMPLETED";
    LabOrderStatus["CANCELLED"] = "CANCELLED";
})(LabOrderStatus || (LabOrderStatus = {}));
export var LabPriority;
(function (LabPriority) {
    LabPriority["ROUTINE"] = "ROUTINE";
    LabPriority["URGENT"] = "URGENT";
    LabPriority["STAT"] = "STAT";
})(LabPriority || (LabPriority = {}));
export var ResultFlag;
(function (ResultFlag) {
    ResultFlag["NORMAL"] = "NORMAL";
    ResultFlag["ABNORMAL"] = "ABNORMAL";
    ResultFlag["CRITICAL"] = "CRITICAL";
})(ResultFlag || (ResultFlag = {}));
