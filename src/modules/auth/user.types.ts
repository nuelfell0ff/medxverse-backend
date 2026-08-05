import { OrganizationType } from '../organization/organization.types.js';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  
  // Hospital Specific Roles
  HOSPITAL_ADMIN = 'HOSPITAL_ADMIN',
  DOCTOR = 'DOCTOR',
  NURSE = 'NURSE',
  PHARMACIST = 'PHARMACIST',
  LAB_SCIENTIST = 'LAB_SCIENTIST',
  RADIOLOGIST = 'RADIOLOGIST',
  RECEPTIONIST = 'RECEPTIONIST',
  BILLING_OFFICER = 'BILLING_OFFICER',

  // HMO Specific Roles
  HMO_ADMIN = 'HMO_ADMIN',
  HMO_CLAIMS_OFFICER = 'HMO_CLAIMS_OFFICER',
  HMO_DESK_OFFICER = 'HMO_DESK_OFFICER',
}

export interface IUser {
  _id: string;
  organizationId: string; // Linked Hospital or HMO entity
  orgType: OrganizationType; // Enforces Dashboard Navigation Split
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  phone: string;
  role: UserRole;
  department?: string;
  licenseNumber?: string;
  isActive: boolean;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}