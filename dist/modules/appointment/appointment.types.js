export var AppointmentStatus;
(function (AppointmentStatus) {
    AppointmentStatus["SCHEDULED"] = "SCHEDULED";
    AppointmentStatus["CHECKED_IN"] = "CHECKED_IN";
    AppointmentStatus["IN_PROGRESS"] = "IN_PROGRESS";
    AppointmentStatus["COMPLETED"] = "COMPLETED";
    AppointmentStatus["CANCELLED"] = "CANCELLED";
    AppointmentStatus["NO_SHOW"] = "NO_SHOW";
})(AppointmentStatus || (AppointmentStatus = {}));
export var AppointmentType;
(function (AppointmentType) {
    AppointmentType["CONSULTATION"] = "CONSULTATION";
    AppointmentType["FOLLOW_UP"] = "FOLLOW_UP";
    AppointmentType["EMERGENCY"] = "EMERGENCY";
    AppointmentType["ROUTINE_CHECKUP"] = "ROUTINE_CHECKUP";
    AppointmentType["SURGERY_PREP"] = "SURGERY_PREP";
})(AppointmentType || (AppointmentType = {}));
