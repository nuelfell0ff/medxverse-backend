export var BloodGroup;
(function (BloodGroup) {
    BloodGroup["A_POSITIVE"] = "A_POSITIVE";
    BloodGroup["A_NEGATIVE"] = "A_NEGATIVE";
    BloodGroup["B_POSITIVE"] = "B_POSITIVE";
    BloodGroup["B_NEGATIVE"] = "B_NEGATIVE";
    BloodGroup["AB_POSITIVE"] = "AB_POSITIVE";
    BloodGroup["AB_NEGATIVE"] = "AB_NEGATIVE";
    BloodGroup["O_POSITIVE"] = "O_POSITIVE";
    BloodGroup["O_NEGATIVE"] = "O_NEGATIVE";
})(BloodGroup || (BloodGroup = {}));
export var BloodComponentType;
(function (BloodComponentType) {
    BloodComponentType["WHOLE_BLOOD"] = "WHOLE_BLOOD";
    BloodComponentType["PACKED_RED_BLOOD_CELLS"] = "PACKED_RED_BLOOD_CELLS";
    BloodComponentType["FRESH_FROZEN_PLASMA"] = "FRESH_FROZEN_PLASMA";
    BloodComponentType["PLATELETS"] = "PLATELETS";
    BloodComponentType["CRYOPRECIPITATE"] = "CRYOPRECIPITATE";
})(BloodComponentType || (BloodComponentType = {}));
export var BloodUnitStatus;
(function (BloodUnitStatus) {
    BloodUnitStatus["AVAILABLE"] = "AVAILABLE";
    BloodUnitStatus["RESERVED"] = "RESERVED";
    BloodUnitStatus["TRANSFUSED"] = "TRANSFUSED";
    BloodUnitStatus["EXPIRED"] = "EXPIRED";
    BloodUnitStatus["DISCARDED"] = "DISCARDED";
    BloodUnitStatus["QUARANTINED"] = "QUARANTINED";
})(BloodUnitStatus || (BloodUnitStatus = {}));
export var TransfusionRequestStatus;
(function (TransfusionRequestStatus) {
    TransfusionRequestStatus["PENDING"] = "PENDING";
    TransfusionRequestStatus["CROSSMATCHED"] = "CROSSMATCHED";
    TransfusionRequestStatus["APPROVED"] = "APPROVED";
    TransfusionRequestStatus["COMPLETED"] = "COMPLETED";
    TransfusionRequestStatus["CANCELLED"] = "CANCELLED";
    TransfusionRequestStatus["REJECTED"] = "REJECTED";
})(TransfusionRequestStatus || (TransfusionRequestStatus = {}));
export var TransfusionUrgency;
(function (TransfusionUrgency) {
    TransfusionUrgency["ROUTINE"] = "ROUTINE";
    TransfusionUrgency["URGENT"] = "URGENT";
    TransfusionUrgency["EMERGENCY"] = "EMERGENCY";
})(TransfusionUrgency || (TransfusionUrgency = {}));
export var CrossmatchResult;
(function (CrossmatchResult) {
    CrossmatchResult["NOT_DONE"] = "NOT_DONE";
    CrossmatchResult["COMPATIBLE"] = "COMPATIBLE";
    CrossmatchResult["INCOMPATIBLE"] = "INCOMPATIBLE";
})(CrossmatchResult || (CrossmatchResult = {}));
