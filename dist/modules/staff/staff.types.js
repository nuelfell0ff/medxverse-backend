export var StaffRole;
(function (StaffRole) {
    StaffRole["DOCTOR"] = "DOCTOR";
    StaffRole["NURSE"] = "NURSE";
    StaffRole["PHARMACIST"] = "PHARMACIST";
    StaffRole["LAB_TECH"] = "LAB_TECH";
    StaffRole["RADIOLOGY_TECH"] = "RADIOLOGY_TECH";
    StaffRole["PHYSIOTHERAPIST"] = "PHYSIOTHERAPIST";
    StaffRole["DENTIST"] = "DENTIST";
    StaffRole["MIDWIFE"] = "MIDWIFE";
    StaffRole["DIETITIAN"] = "DIETITIAN";
    StaffRole["PSYCHOLOGIST"] = "PSYCHOLOGIST";
    StaffRole["HEALTHCARE_ASSISTANT"] = "HEALTHCARE_ASSISTANT";
    StaffRole["ADMINISTRATIVE"] = "ADMINISTRATIVE";
    StaffRole["RECEPTIONIST"] = "RECEPTIONIST";
    StaffRole["ACCOUNTANT"] = "ACCOUNTANT";
    StaffRole["OTHER"] = "OTHER";
})(StaffRole || (StaffRole = {}));
export var StaffCategory;
(function (StaffCategory) {
    StaffCategory["CLINICAL"] = "CLINICAL";
    StaffCategory["ALLIED_HEALTH"] = "ALLIED_HEALTH";
    StaffCategory["ADMINISTRATIVE"] = "ADMINISTRATIVE";
    StaffCategory["SUPPORT"] = "SUPPORT";
})(StaffCategory || (StaffCategory = {}));
export var StaffClassification;
(function (StaffClassification) {
    StaffClassification["CONSULTANT"] = "CONSULTANT";
    StaffClassification["SPECIALIST"] = "SPECIALIST";
    StaffClassification["RESIDENT"] = "RESIDENT";
    StaffClassification["INTERN"] = "INTERN";
    StaffClassification["SENIOR"] = "SENIOR";
    StaffClassification["JUNIOR"] = "JUNIOR";
    StaffClassification["GENERAL"] = "GENERAL";
})(StaffClassification || (StaffClassification = {}));
export var EmploymentType;
(function (EmploymentType) {
    EmploymentType["FULL_TIME"] = "FULL_TIME";
    EmploymentType["PART_TIME"] = "PART_TIME";
    EmploymentType["CONTRACT"] = "CONTRACT";
    EmploymentType["LOCUM"] = "LOCUM";
    EmploymentType["TEMPORARY"] = "TEMPORARY";
    EmploymentType["INTERN"] = "INTERN";
    EmploymentType["VOLUNTEER"] = "VOLUNTEER";
})(EmploymentType || (EmploymentType = {}));
export var StaffStatus;
(function (StaffStatus) {
    StaffStatus["ACTIVE"] = "ACTIVE";
    StaffStatus["INACTIVE"] = "INACTIVE";
    StaffStatus["ON_LEAVE"] = "ON_LEAVE";
    StaffStatus["SUSPENDED"] = "SUSPENDED";
    StaffStatus["TERMINATED"] = "TERMINATED";
})(StaffStatus || (StaffStatus = {}));
export var CredentialStatus;
(function (CredentialStatus) {
    CredentialStatus["PENDING"] = "PENDING";
    CredentialStatus["VERIFIED"] = "VERIFIED";
    CredentialStatus["EXPIRED"] = "EXPIRED";
    CredentialStatus["REJECTED"] = "REJECTED";
})(CredentialStatus || (CredentialStatus = {}));
export var PrivilegeStatus;
(function (PrivilegeStatus) {
    PrivilegeStatus["ACTIVE"] = "ACTIVE";
    PrivilegeStatus["EXPIRED"] = "EXPIRED";
    PrivilegeStatus["SUSPENDED"] = "SUSPENDED";
    PrivilegeStatus["PENDING_RENEWAL"] = "PENDING_RENEWAL";
})(PrivilegeStatus || (PrivilegeStatus = {}));
export var TrainingStatus;
(function (TrainingStatus) {
    TrainingStatus["PENDING"] = "PENDING";
    TrainingStatus["IN_PROGRESS"] = "IN_PROGRESS";
    TrainingStatus["COMPLETED"] = "COMPLETED";
    TrainingStatus["EXPIRED"] = "EXPIRED";
})(TrainingStatus || (TrainingStatus = {}));
export var LeaveStatus;
(function (LeaveStatus) {
    LeaveStatus["PENDING"] = "PENDING";
    LeaveStatus["APPROVED"] = "APPROVED";
    LeaveStatus["REJECTED"] = "REJECTED";
    LeaveStatus["CANCELLED"] = "CANCELLED";
})(LeaveStatus || (LeaveStatus = {}));
export var AttendanceStatus;
(function (AttendanceStatus) {
    AttendanceStatus["PRESENT"] = "PRESENT";
    AttendanceStatus["ABSENT"] = "ABSENT";
    AttendanceStatus["LATE"] = "LATE";
    AttendanceStatus["HALF_DAY"] = "HALF_DAY";
    AttendanceStatus["ON_LEAVE"] = "ON_LEAVE";
})(AttendanceStatus || (AttendanceStatus = {}));
export var AvailabilityStatus;
(function (AvailabilityStatus) {
    AvailabilityStatus["AVAILABLE"] = "AVAILABLE";
    AvailabilityStatus["UNAVAILABLE"] = "UNAVAILABLE";
    AvailabilityStatus["ON_CALL"] = "ON_CALL";
    AvailabilityStatus["ON_LEAVE"] = "ON_LEAVE";
})(AvailabilityStatus || (AvailabilityStatus = {}));
