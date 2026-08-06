import { Document, Types } from 'mongoose';
import { UserRole } from '../../constants/roles.enum.js';

export interface IUser {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: UserRole;
  organizationId: Types.ObjectId;
  staffCode: string;
  phoneNumber?: string;
  department?: string;
  specialization?: string;
  licenseNumber?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserDocument extends IUser, Document {
  _id: Types.ObjectId;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: UserRole;
  organizationId?: string;
  phoneNumber?: string;
  department?: string;
  specialization?: string;
  licenseNumber?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  department?: string;
  specialization?: string;
  licenseNumber?: string;
  role?: UserRole;
}

export interface UserQueryFilters {
  role?: UserRole;
  department?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}