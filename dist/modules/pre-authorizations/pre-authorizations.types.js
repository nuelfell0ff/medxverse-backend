export var PreAuthStatus;
(function (PreAuthStatus) {
    PreAuthStatus["NEW_REQUEST"] = "NEW_REQUEST";
    PreAuthStatus["PENDING"] = "PENDING";
    PreAuthStatus["APPROVED"] = "APPROVED";
    PreAuthStatus["DECLINED"] = "DECLINED";
    PreAuthStatus["CANCELLED"] = "CANCELLED";
})(PreAuthStatus || (PreAuthStatus = {}));
export var PreAuthPriority;
(function (PreAuthPriority) {
    PreAuthPriority["ROUTINE"] = "ROUTINE";
    PreAuthPriority["URGENT"] = "URGENT";
    PreAuthPriority["EMERGENCY"] = "EMERGENCY";
})(PreAuthPriority || (PreAuthPriority = {}));
