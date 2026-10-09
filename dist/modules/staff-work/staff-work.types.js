export var WorkTaskStatus;
(function (WorkTaskStatus) {
    WorkTaskStatus["PENDING"] = "PENDING";
    WorkTaskStatus["IN_PROGRESS"] = "IN_PROGRESS";
    WorkTaskStatus["COMPLETED"] = "COMPLETED";
    WorkTaskStatus["CANCELLED"] = "CANCELLED";
    WorkTaskStatus["OVERDUE"] = "OVERDUE";
})(WorkTaskStatus || (WorkTaskStatus = {}));
export var WorkTaskPriority;
(function (WorkTaskPriority) {
    WorkTaskPriority["LOW"] = "LOW";
    WorkTaskPriority["NORMAL"] = "NORMAL";
    WorkTaskPriority["HIGH"] = "HIGH";
    WorkTaskPriority["URGENT"] = "URGENT";
})(WorkTaskPriority || (WorkTaskPriority = {}));
export var WorkTaskCategory;
(function (WorkTaskCategory) {
    WorkTaskCategory["GENERAL"] = "GENERAL";
    WorkTaskCategory["CLINICAL"] = "CLINICAL";
    WorkTaskCategory["FOLLOW_UP"] = "FOLLOW_UP";
    WorkTaskCategory["REVIEW"] = "REVIEW";
    WorkTaskCategory["DOCUMENTATION"] = "DOCUMENTATION";
    WorkTaskCategory["ADMINISTRATIVE"] = "ADMINISTRATIVE";
})(WorkTaskCategory || (WorkTaskCategory = {}));
export var WorkTicketStatus;
(function (WorkTicketStatus) {
    WorkTicketStatus["OPEN"] = "OPEN";
    WorkTicketStatus["ASSIGNED"] = "ASSIGNED";
    WorkTicketStatus["IN_PROGRESS"] = "IN_PROGRESS";
    WorkTicketStatus["WAITING"] = "WAITING";
    WorkTicketStatus["RESOLVED"] = "RESOLVED";
    WorkTicketStatus["CLOSED"] = "CLOSED";
})(WorkTicketStatus || (WorkTicketStatus = {}));
export var WorkTicketPriority;
(function (WorkTicketPriority) {
    WorkTicketPriority["LOW"] = "LOW";
    WorkTicketPriority["NORMAL"] = "NORMAL";
    WorkTicketPriority["HIGH"] = "HIGH";
    WorkTicketPriority["URGENT"] = "URGENT";
    WorkTicketPriority["CRITICAL"] = "CRITICAL";
})(WorkTicketPriority || (WorkTicketPriority = {}));
export var WorkTicketCategory;
(function (WorkTicketCategory) {
    WorkTicketCategory["PATIENT"] = "PATIENT";
    WorkTicketCategory["CLINICAL"] = "CLINICAL";
    WorkTicketCategory["APPOINTMENT"] = "APPOINTMENT";
    WorkTicketCategory["LABORATORY"] = "LABORATORY";
    WorkTicketCategory["RADIOLOGY"] = "RADIOLOGY";
    WorkTicketCategory["PHARMACY"] = "PHARMACY";
    WorkTicketCategory["SURGERY"] = "SURGERY";
    WorkTicketCategory["EMERGENCY"] = "EMERGENCY";
    WorkTicketCategory["TECHNICAL"] = "TECHNICAL";
    WorkTicketCategory["ADMINISTRATIVE"] = "ADMINISTRATIVE";
    WorkTicketCategory["OTHER"] = "OTHER";
})(WorkTicketCategory || (WorkTicketCategory = {}));
