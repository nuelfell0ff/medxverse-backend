export var OrgType;
(function (OrgType) {
    OrgType["HOSPITAL"] = "HOSPITAL";
    OrgType["HMO"] = "HMO";
})(OrgType || (OrgType = {}));
export var UserRole;
(function (UserRole) {
    // Super Admin
    UserRole["SYSTEM_ADMIN"] = "SYSTEM_ADMIN";
    // Hospital System Roles
    UserRole["HOSPITAL_ADMIN"] = "HOSPITAL_ADMIN";
    UserRole["DOCTOR"] = "DOCTOR";
    UserRole["NURSE"] = "NURSE";
    UserRole["PHARMACIST"] = "PHARMACIST";
    UserRole["LAB_TECHNICIAN"] = "LAB_TECHNICIAN";
    UserRole["RADIOLOGIST"] = "RADIOLOGIST";
    UserRole["BILLING_OFFICER"] = "BILLING_OFFICER";
    UserRole["RECEPTIONIST"] = "RECEPTIONIST";
    UserRole["ACCOUNTANT"] = "ACCOUNTANT";
    // HMO Portal Roles
    UserRole["HMO_ADMIN"] = "HMO_ADMIN";
    UserRole["HMO_CLAIMS_OFFICER"] = "HMO_CLAIMS_OFFICER";
    UserRole["HMO_MEDICAL_OFFICER"] = "HMO_MEDICAL_OFFICER";
    UserRole["HMO_OFFICER"] = "HMO_OFFICER";
    // Patient / Enrollee
    UserRole["PATIENT"] = "PATIENT";
})(UserRole || (UserRole = {}));
export const HOSPITAL_ROLES = [
    UserRole.HOSPITAL_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.PHARMACIST,
    UserRole.LAB_TECHNICIAN,
    UserRole.RADIOLOGIST,
    UserRole.BILLING_OFFICER,
    UserRole.RECEPTIONIST,
    UserRole.ACCOUNTANT,
];
export const HMO_ROLES = [
    UserRole.HMO_ADMIN,
    UserRole.HMO_CLAIMS_OFFICER,
    UserRole.HMO_MEDICAL_OFFICER,
    UserRole.HMO_OFFICER
];
