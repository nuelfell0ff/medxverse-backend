export var NotificationType;
(function (NotificationType) {
    NotificationType["CLAIM_STATUS"] = "CLAIM_STATUS";
    NotificationType["PRE_AUTH_STATUS"] = "PRE_AUTH_STATUS";
    NotificationType["PAYMENT_DISBURSED"] = "PAYMENT_DISBURSED";
    NotificationType["SYSTEM_ALERT"] = "SYSTEM_ALERT";
    NotificationType["POLICY_EXPIRING"] = "POLICY_EXPIRING";
})(NotificationType || (NotificationType = {}));
export var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["IN_APP"] = "IN_APP";
    NotificationChannel["EMAIL"] = "EMAIL";
    NotificationChannel["SMS"] = "SMS";
})(NotificationChannel || (NotificationChannel = {}));
export var NotificationStatus;
(function (NotificationStatus) {
    NotificationStatus["PENDING"] = "PENDING";
    NotificationStatus["SENT"] = "SENT";
    NotificationStatus["FAILED"] = "FAILED";
    NotificationStatus["READ"] = "READ";
})(NotificationStatus || (NotificationStatus = {}));
