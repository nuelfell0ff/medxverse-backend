/* =========================================================
   ENUMS
========================================================= */
export var RosterAreaType;
(function (RosterAreaType) {
    RosterAreaType["DEPARTMENT"] = "DEPARTMENT";
    RosterAreaType["WARD"] = "WARD";
    RosterAreaType["THEATRE"] = "THEATRE";
    RosterAreaType["ICU"] = "ICU";
    RosterAreaType["EMERGENCY"] = "EMERGENCY";
    RosterAreaType["CLINIC_OPD"] = "CLINIC_OPD";
    RosterAreaType["LABORATORY"] = "LABORATORY";
    RosterAreaType["RADIOLOGY"] = "RADIOLOGY";
    RosterAreaType["PHARMACY"] = "PHARMACY";
    RosterAreaType["OTHER"] = "OTHER";
})(RosterAreaType || (RosterAreaType = {}));
export var ShiftType;
(function (ShiftType) {
    ShiftType["DAY"] = "DAY";
    ShiftType["EVENING"] = "EVENING";
    ShiftType["NIGHT"] = "NIGHT";
    ShiftType["ON_CALL"] = "ON_CALL";
    ShiftType["CUSTOM"] = "CUSTOM";
})(ShiftType || (ShiftType = {}));
export var ShiftStatus;
(function (ShiftStatus) {
    ShiftStatus["OPEN"] = "OPEN";
    ShiftStatus["ASSIGNED"] = "ASSIGNED";
    ShiftStatus["ACCEPTED"] = "ACCEPTED";
    ShiftStatus["DECLINED"] = "DECLINED";
    ShiftStatus["IN_PROGRESS"] = "IN_PROGRESS";
    ShiftStatus["COMPLETED"] = "COMPLETED";
    ShiftStatus["CANCELLED"] = "CANCELLED";
})(ShiftStatus || (ShiftStatus = {}));
export var RosterStatus;
(function (RosterStatus) {
    RosterStatus["DRAFT"] = "DRAFT";
    RosterStatus["PUBLISHED"] = "PUBLISHED";
    RosterStatus["ARCHIVED"] = "ARCHIVED";
})(RosterStatus || (RosterStatus = {}));
export var AssignmentStatus;
(function (AssignmentStatus) {
    AssignmentStatus["PENDING"] = "PENDING";
    AssignmentStatus["ACCEPTED"] = "ACCEPTED";
    AssignmentStatus["DECLINED"] = "DECLINED";
    AssignmentStatus["CANCELLED"] = "CANCELLED";
    AssignmentStatus["COMPLETED"] = "COMPLETED";
})(AssignmentStatus || (AssignmentStatus = {}));
export var AttendanceStatus;
(function (AttendanceStatus) {
    AttendanceStatus["SCHEDULED"] = "SCHEDULED";
    AttendanceStatus["PRESENT"] = "PRESENT";
    AttendanceStatus["LATE"] = "LATE";
    AttendanceStatus["ABSENT"] = "ABSENT";
    AttendanceStatus["MISSED_SIGN_OUT"] = "MISSED_SIGN_OUT";
})(AttendanceStatus || (AttendanceStatus = {}));
export var SwapStatus;
(function (SwapStatus) {
    SwapStatus["PENDING"] = "PENDING";
    SwapStatus["APPROVED"] = "APPROVED";
    SwapStatus["REJECTED"] = "REJECTED";
    SwapStatus["CANCELLED"] = "CANCELLED";
})(SwapStatus || (SwapStatus = {}));
export var HandoverStatus;
(function (HandoverStatus) {
    HandoverStatus["PENDING"] = "PENDING";
    HandoverStatus["COMPLETED"] = "COMPLETED";
    HandoverStatus["SKIPPED"] = "SKIPPED";
})(HandoverStatus || (HandoverStatus = {}));
export var AvailabilityStatus;
(function (AvailabilityStatus) {
    AvailabilityStatus["AVAILABLE"] = "AVAILABLE";
    AvailabilityStatus["UNAVAILABLE"] = "UNAVAILABLE";
    AvailabilityStatus["PREFERRED"] = "PREFERRED";
})(AvailabilityStatus || (AvailabilityStatus = {}));
export var LeaveStatus;
(function (LeaveStatus) {
    LeaveStatus["PENDING"] = "PENDING";
    LeaveStatus["APPROVED"] = "APPROVED";
    LeaveStatus["REJECTED"] = "REJECTED";
    LeaveStatus["CANCELLED"] = "CANCELLED";
})(LeaveStatus || (LeaveStatus = {}));
