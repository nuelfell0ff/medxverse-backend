import { Document, Types } from 'mongoose';

export enum StaffRole {
  DOCTOR = 'DOCTOR',
  NURSE = 'NURSE',
  PHARMACIST = 'PHARMACIST',
  LAB_TECH = 'LAB_TECH',
  RECEPTIONIST = 'RECEPTIONIST',
  ACCOUNTANT = 'ACCOUNTANT',
  OTHER = 'OTHER',
}

export interface IStaff {
  hospitalId: Types.ObjectId;
  firstName: string;
  lastName: string;
  role: StaffRole;
  department?: string;
  licenseNumber?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStaffDocument extends IStaff, Document {
  _id: Types.ObjectId;
}

export interface CreateStaffDTO {
  firstName: string;
  lastName: string;
  role: StaffRole;
  department?: string;
  licenseNumber?: string;
  phone?: string;
  email?: string;
}

export interface UpdateStaffDTO {
  firstName?: string;
  lastName?: string;
  role?: StaffRole;
  department?: string;
  licenseNumber?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
}