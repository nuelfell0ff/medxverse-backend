export var NotificationType;
(function (NotificationType) {
    NotificationType["APPOINTMENT"] = "APPOINTMENT";
    NotificationType["LAB_RESULT"] = "LAB_RESULT";
    NotificationType["EMERGENCY"] = "EMERGENCY";
    NotificationType["PRESCRIPTION"] = "PRESCRIPTION";
    NotificationType["SYSTEM"] = "SYSTEM";
    NotificationType["BILLING"] = "BILLING";
    NotificationType["GENERAL"] = "GENERAL";
})(NotificationType || (NotificationType = {}));
export var NotificationPriority;
(function (NotificationPriority) {
    NotificationPriority["LOW"] = "LOW";
    NotificationPriority["MEDIUM"] = "MEDIUM";
    NotificationPriority["HIGH"] = "HIGH";
    NotificationPriority["URGENT"] = "URGENT";
})(NotificationPriority || (NotificationPriority = {}));
export var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["IN_APP"] = "IN_APP";
    NotificationChannel["EMAIL"] = "EMAIL";
    NotificationChannel["SMS"] = "SMS";
})(NotificationChannel || (NotificationChannel = {}));
export var NotificationStatus;
(function (NotificationStatus) {
    NotificationStatus["UNREAD"] = "UNREAD";
    NotificationStatus["READ"] = "READ";
    NotificationStatus["ARCHIVED"] = "ARCHIVED";
})(NotificationStatus || (NotificationStatus = {}));
