export var UtilizationEventType;
(function (UtilizationEventType) {
    UtilizationEventType["VISIT"] = "VISIT";
    UtilizationEventType["ADMISSION"] = "ADMISSION";
    UtilizationEventType["PROCEDURE"] = "PROCEDURE";
    UtilizationEventType["PHARMACY"] = "PHARMACY";
    UtilizationEventType["LABORATORY"] = "LABORATORY";
    UtilizationEventType["IMAGING"] = "IMAGING";
    UtilizationEventType["OTHER"] = "OTHER";
})(UtilizationEventType || (UtilizationEventType = {}));
export var UtilizationSourceType;
(function (UtilizationSourceType) {
    UtilizationSourceType["CLAIM"] = "CLAIM";
    UtilizationSourceType["PRE_AUTH"] = "PRE_AUTH";
    UtilizationSourceType["ELIGIBILITY"] = "ELIGIBILITY";
    UtilizationSourceType["BILLING"] = "BILLING";
    UtilizationSourceType["MANUAL"] = "MANUAL";
})(UtilizationSourceType || (UtilizationSourceType = {}));
export var RiskSeverity;
(function (RiskSeverity) {
    RiskSeverity["LOW"] = "LOW";
    RiskSeverity["MEDIUM"] = "MEDIUM";
    RiskSeverity["HIGH"] = "HIGH";
    RiskSeverity["CRITICAL"] = "CRITICAL";
})(RiskSeverity || (RiskSeverity = {}));
export var AlertStatus;
(function (AlertStatus) {
    AlertStatus["OPEN"] = "OPEN";
    AlertStatus["ACKNOWLEDGED"] = "ACKNOWLEDGED";
    AlertStatus["INVESTIGATING"] = "INVESTIGATING";
    AlertStatus["RESOLVED"] = "RESOLVED";
    AlertStatus["DISMISSED"] = "DISMISSED";
})(AlertStatus || (AlertStatus = {}));
export var FraudCaseStatus;
(function (FraudCaseStatus) {
    FraudCaseStatus["OPEN"] = "OPEN";
    FraudCaseStatus["INVESTIGATING"] = "INVESTIGATING";
    FraudCaseStatus["CONFIRMED"] = "CONFIRMED";
    FraudCaseStatus["DISMISSED"] = "DISMISSED";
    FraudCaseStatus["RECOVERED"] = "RECOVERED";
    FraudCaseStatus["CLOSED"] = "CLOSED";
})(FraudCaseStatus || (FraudCaseStatus = {}));
export var FraudEntityType;
(function (FraudEntityType) {
    FraudEntityType["MEMBER"] = "MEMBER";
    FraudEntityType["PROVIDER"] = "PROVIDER";
    FraudEntityType["CLAIM"] = "CLAIM";
    FraudEntityType["BILLING"] = "BILLING";
    FraudEntityType["MULTIPLE"] = "MULTIPLE";
})(FraudEntityType || (FraudEntityType = {}));
export var RuleOperator;
(function (RuleOperator) {
    RuleOperator["GT"] = "GT";
    RuleOperator["GTE"] = "GTE";
    RuleOperator["LT"] = "LT";
    RuleOperator["LTE"] = "LTE";
    RuleOperator["EQ"] = "EQ";
    RuleOperator["NEQ"] = "NEQ";
})(RuleOperator || (RuleOperator = {}));
