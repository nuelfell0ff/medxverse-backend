export var ImagingModality;
(function (ImagingModality) {
    ImagingModality["X_RAY"] = "X_RAY";
    ImagingModality["CT_SCAN"] = "CT_SCAN";
    ImagingModality["MRI"] = "MRI";
    ImagingModality["ULTRASOUND"] = "ULTRASOUND";
    ImagingModality["MAMMOGRAPHY"] = "MAMMOGRAPHY";
    ImagingModality["PET_SCAN"] = "PET_SCAN";
    ImagingModality["DEXA"] = "DEXA";
    ImagingModality["OTHER"] = "OTHER";
})(ImagingModality || (ImagingModality = {}));
export var RadiologyOrderStatus;
(function (RadiologyOrderStatus) {
    RadiologyOrderStatus["REQUESTED"] = "REQUESTED";
    RadiologyOrderStatus["SCHEDULED"] = "SCHEDULED";
    RadiologyOrderStatus["IN_PROGRESS"] = "IN_PROGRESS";
    RadiologyOrderStatus["COMPLETED"] = "COMPLETED";
    RadiologyOrderStatus["REPORTED"] = "REPORTED";
    RadiologyOrderStatus["CANCELLED"] = "CANCELLED";
})(RadiologyOrderStatus || (RadiologyOrderStatus = {}));
export var PriorityLevel;
(function (PriorityLevel) {
    PriorityLevel["ROUTINE"] = "ROUTINE";
    PriorityLevel["URGENT"] = "URGENT";
    PriorityLevel["STAT"] = "STAT";
})(PriorityLevel || (PriorityLevel = {}));
