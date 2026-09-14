export var WardCleaningStatus;
(function (WardCleaningStatus) {
    WardCleaningStatus["IDLE"] = "IDLE";
    WardCleaningStatus["IN_PROGRESS"] = "IN_PROGRESS";
})(WardCleaningStatus || (WardCleaningStatus = {}));
export var BedStatus;
(function (BedStatus) {
    BedStatus["AVAILABLE"] = "AVAILABLE";
    BedStatus["OCCUPIED"] = "OCCUPIED";
    BedStatus["CLEANING"] = "CLEANING";
    BedStatus["BLOCKED"] = "BLOCKED";
})(BedStatus || (BedStatus = {}));
export var BedStatusEventType;
(function (BedStatusEventType) {
    BedStatusEventType["CREATED"] = "CREATED";
    BedStatusEventType["STATUS_CHANGED"] = "STATUS_CHANGED";
    BedStatusEventType["ASSIGNED"] = "ASSIGNED";
    BedStatusEventType["RELEASED"] = "RELEASED";
    BedStatusEventType["BLOCKED"] = "BLOCKED";
    BedStatusEventType["UNBLOCKED"] = "UNBLOCKED";
    BedStatusEventType["CLEANING_REQUESTED"] = "CLEANING_REQUESTED";
    BedStatusEventType["CLEANING_COMPLETED"] = "CLEANING_COMPLETED";
})(BedStatusEventType || (BedStatusEventType = {}));
export var AssignmentStatus;
(function (AssignmentStatus) {
    AssignmentStatus["RESERVED"] = "RESERVED";
    AssignmentStatus["ACTIVE"] = "ACTIVE";
    AssignmentStatus["RELEASED"] = "RELEASED";
    AssignmentStatus["CANCELLED"] = "CANCELLED";
})(AssignmentStatus || (AssignmentStatus = {}));
export var TransferRequestStatus;
(function (TransferRequestStatus) {
    TransferRequestStatus["REQUESTED"] = "REQUESTED";
    TransferRequestStatus["MATCHED"] = "MATCHED";
    TransferRequestStatus["ACCEPTED"] = "ACCEPTED";
    TransferRequestStatus["IN_PROGRESS"] = "IN_PROGRESS";
    TransferRequestStatus["COMPLETED"] = "COMPLETED";
    TransferRequestStatus["CANCELLED"] = "CANCELLED";
    TransferRequestStatus["FAILED"] = "FAILED";
})(TransferRequestStatus || (TransferRequestStatus = {}));
export var AdmissionRequestSource;
(function (AdmissionRequestSource) {
    AdmissionRequestSource["EMERGENCY"] = "EMERGENCY";
    AdmissionRequestSource["THEATRE"] = "THEATRE";
    AdmissionRequestSource["ICU"] = "ICU";
    AdmissionRequestSource["DIRECT_REFERRAL"] = "DIRECT_REFERRAL";
    AdmissionRequestSource["INTERNAL_TRANSFER"] = "INTERNAL_TRANSFER";
    AdmissionRequestSource["OTHER"] = "OTHER";
})(AdmissionRequestSource || (AdmissionRequestSource = {}));
