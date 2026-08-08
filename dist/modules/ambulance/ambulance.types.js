export var VehicleType;
(function (VehicleType) {
    VehicleType["BASIC_LIFE_SUPPORT"] = "BASIC_LIFE_SUPPORT";
    VehicleType["ADVANCED_LIFE_SUPPORT"] = "ADVANCED_LIFE_SUPPORT";
    VehicleType["PATIENT_TRANSPORT"] = "PATIENT_TRANSPORT";
    VehicleType["ICU_AMBULANCE"] = "ICU_AMBULANCE";
    VehicleType["NEONATAL_AMBULANCE"] = "NEONATAL_AMBULANCE";
})(VehicleType || (VehicleType = {}));
export var VehicleStatus;
(function (VehicleStatus) {
    VehicleStatus["AVAILABLE"] = "AVAILABLE";
    VehicleStatus["DISPATCHED"] = "DISPATCHED";
    VehicleStatus["EN_ROUTE"] = "EN_ROUTE";
    VehicleStatus["MAINTENANCE"] = "MAINTENANCE";
    VehicleStatus["OUT_OF_SERVICE"] = "OUT_OF_SERVICE";
})(VehicleStatus || (VehicleStatus = {}));
export var TripPriority;
(function (TripPriority) {
    TripPriority["LOW"] = "LOW";
    TripPriority["MEDIUM"] = "MEDIUM";
    TripPriority["HIGH"] = "HIGH";
    TripPriority["CRITICAL"] = "CRITICAL";
})(TripPriority || (TripPriority = {}));
export var TripStatus;
(function (TripStatus) {
    TripStatus["REQUESTED"] = "REQUESTED";
    TripStatus["DISPATCHED"] = "DISPATCHED";
    TripStatus["EN_ROUTE_TO_SCENE"] = "EN_ROUTE_TO_SCENE";
    TripStatus["ARRIVED_AT_SCENE"] = "ARRIVED_AT_SCENE";
    TripStatus["PATIENT_ONBOARD"] = "PATIENT_ONBOARD";
    TripStatus["EN_ROUTE_TO_DESTINATION"] = "EN_ROUTE_TO_DESTINATION";
    TripStatus["COMPLETED"] = "COMPLETED";
    TripStatus["CANCELLED"] = "CANCELLED";
})(TripStatus || (TripStatus = {}));
