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
export var ReminderChannel;
(function (ReminderChannel) {
    ReminderChannel["SMS"] = "SMS";
    ReminderChannel["PUSH"] = "PUSH";
    ReminderChannel["EMAIL"] = "EMAIL";
})(ReminderChannel || (ReminderChannel = {}));
export var ReminderStatus;
(function (ReminderStatus) {
    ReminderStatus["SCHEDULED"] = "SCHEDULED";
    ReminderStatus["SENT"] = "SENT";
    ReminderStatus["FAILED"] = "FAILED";
    ReminderStatus["CANCELLED"] = "CANCELLED";
})(ReminderStatus || (ReminderStatus = {}));
export var QueueTicketStatus;
(function (QueueTicketStatus) {
    QueueTicketStatus["WAITING"] = "WAITING";
    QueueTicketStatus["CALLED"] = "CALLED";
    QueueTicketStatus["IN_SERVICE"] = "IN_SERVICE";
    QueueTicketStatus["COMPLETED"] = "COMPLETED";
    QueueTicketStatus["CANCELLED"] = "CANCELLED";
    QueueTicketStatus["NO_SHOW"] = "NO_SHOW";
})(QueueTicketStatus || (QueueTicketStatus = {}));
export var QueuePriority;
(function (QueuePriority) {
    QueuePriority["ROUTINE"] = "ROUTINE";
    QueuePriority["PRIORITY"] = "PRIORITY";
    QueuePriority["URGENT"] = "URGENT";
    QueuePriority["EMERGENCY"] = "EMERGENCY";
})(QueuePriority || (QueuePriority = {}));
