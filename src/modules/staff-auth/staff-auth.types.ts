import { Document, Types } from 'mongoose';

export enum StaffUserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DISABLED = 'DISABLED',
}

export interface IStaffUser {
  hospitalId: Types.ObjectId;
  staffId: Types.ObjectId;
  email: string;
  password: string;
  role: string;
  status: StaffUserStatus;
  isActive: boolean;
  lastLoginAt?: Date;
  presenceStatus?: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'AWAY';
  lastSeenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStaffUserDocument extends IStaffUser, Document {
  _id: Types.ObjectId;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface AcceptStaffInvitationDTO {
  token: string;
  password: string;
}

export interface StaffLoginDTO {
  email: string;
  password: string;
  hospitalCode?: string;
}

export interface ChangeStaffPasswordDTO {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface UpdateStaffProfileDTO {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  title?: string;
  jobTitle?: string;
  profilePhotoUrl?: string;
  phone?: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface StaffAuthResponse {
  token: string;
  staff: {
    id: string;
    staffId: string;
    hospitalId: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
  };
}
