export var ProviderType;
(function (ProviderType) {
    ProviderType["HOSPITAL"] = "HOSPITAL";
    ProviderType["CLINIC"] = "CLINIC";
    ProviderType["PHARMACY"] = "PHARMACY";
    ProviderType["LABORATORY"] = "LABORATORY";
    ProviderType["SPECIALIST"] = "SPECIALIST";
    ProviderType["DIAGNOSTIC_CENTER"] = "DIAGNOSTIC_CENTER";
    ProviderType["OTHER"] = "OTHER";
})(ProviderType || (ProviderType = {}));
export var ProviderStatus;
(function (ProviderStatus) {
    ProviderStatus["PENDING"] = "PENDING";
    ProviderStatus["ACTIVE"] = "ACTIVE";
    ProviderStatus["INACTIVE"] = "INACTIVE";
    ProviderStatus["SUSPENDED"] = "SUSPENDED";
    ProviderStatus["EXPIRED"] = "EXPIRED";
    ProviderStatus["ARCHIVED"] = "ARCHIVED";
})(ProviderStatus || (ProviderStatus = {}));
export var AccreditationStatus;
(function (AccreditationStatus) {
    AccreditationStatus["PENDING"] = "PENDING";
    AccreditationStatus["VERIFIED"] = "VERIFIED";
    AccreditationStatus["EXPIRED"] = "EXPIRED";
    AccreditationStatus["REJECTED"] = "REJECTED";
})(AccreditationStatus || (AccreditationStatus = {}));
export var ProviderContractStatus;
(function (ProviderContractStatus) {
    ProviderContractStatus["DRAFT"] = "DRAFT";
    ProviderContractStatus["ACTIVE"] = "ACTIVE";
    ProviderContractStatus["EXPIRED"] = "EXPIRED";
    ProviderContractStatus["TERMINATED"] = "TERMINATED";
})(ProviderContractStatus || (ProviderContractStatus = {}));
export var ProviderPaymentModel;
(function (ProviderPaymentModel) {
    ProviderPaymentModel["FEE_FOR_SERVICE"] = "FEE_FOR_SERVICE";
    ProviderPaymentModel["CAPITATION"] = "CAPITATION";
    ProviderPaymentModel["HYBRID"] = "HYBRID";
    ProviderPaymentModel["OTHER"] = "OTHER";
})(ProviderPaymentModel || (ProviderPaymentModel = {}));
