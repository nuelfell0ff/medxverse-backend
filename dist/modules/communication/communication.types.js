export var ConversationType;
(function (ConversationType) {
    ConversationType["DIRECT"] = "DIRECT";
    ConversationType["GROUP"] = "GROUP";
    ConversationType["DEPARTMENT"] = "DEPARTMENT";
    ConversationType["PATIENT_CARE"] = "PATIENT_CARE";
    ConversationType["SUPPORT"] = "SUPPORT";
})(ConversationType || (ConversationType = {}));
export var ParticipantType;
(function (ParticipantType) {
    ParticipantType["STAFF"] = "STAFF";
    ParticipantType["PATIENT"] = "PATIENT";
    ParticipantType["AGENT"] = "AGENT";
    ParticipantType["AI"] = "AI";
    ParticipantType["SYSTEM"] = "SYSTEM";
})(ParticipantType || (ParticipantType = {}));
export var MessageType;
(function (MessageType) {
    MessageType["TEXT"] = "TEXT";
    MessageType["FILE"] = "FILE";
    MessageType["IMAGE"] = "IMAGE";
    MessageType["SYSTEM"] = "SYSTEM";
})(MessageType || (MessageType = {}));
export var ConversationPriority;
(function (ConversationPriority) {
    ConversationPriority["NORMAL"] = "NORMAL";
    ConversationPriority["IMPORTANT"] = "IMPORTANT";
    ConversationPriority["URGENT"] = "URGENT";
    ConversationPriority["CRITICAL"] = "CRITICAL";
})(ConversationPriority || (ConversationPriority = {}));
export var TicketStatus;
(function (TicketStatus) {
    TicketStatus["OPEN"] = "OPEN";
    TicketStatus["IN_PROGRESS"] = "IN_PROGRESS";
    TicketStatus["WAITING"] = "WAITING";
    TicketStatus["RESOLVED"] = "RESOLVED";
    TicketStatus["CLOSED"] = "CLOSED";
})(TicketStatus || (TicketStatus = {}));
export var TicketPriority;
(function (TicketPriority) {
    TicketPriority["LOW"] = "LOW";
    TicketPriority["MEDIUM"] = "MEDIUM";
    TicketPriority["HIGH"] = "HIGH";
    TicketPriority["CRITICAL"] = "CRITICAL";
})(TicketPriority || (TicketPriority = {}));
export var TicketCategory;
(function (TicketCategory) {
    TicketCategory["GENERAL"] = "GENERAL";
    TicketCategory["CLINICAL"] = "CLINICAL";
    TicketCategory["APPOINTMENT"] = "APPOINTMENT";
    TicketCategory["LABORATORY"] = "LABORATORY";
    TicketCategory["PHARMACY"] = "PHARMACY";
    TicketCategory["BILLING"] = "BILLING";
    TicketCategory["INSURANCE"] = "INSURANCE";
    TicketCategory["MEDICAL_RECORDS"] = "MEDICAL_RECORDS";
    TicketCategory["TECHNICAL"] = "TECHNICAL";
})(TicketCategory || (TicketCategory = {}));
