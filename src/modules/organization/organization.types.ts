import { Document, Types } from 'mongoose';
import { OrgType } from '../../constants/roles.enum.js';

export interface IOrganization {
  name: string;
  type: OrgType;
  code: string;
  email: string;
  phone: string;
  address?: string;
  logoUrl?: string;
  registrationNumber?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IOrganizationDocument extends IOrganization, Document {
  _id: Types.ObjectId;
}

export interface CreateOrganizationDto {
  name: string;
  type: OrgType;
  code?: string;
  email: string;
  phone: string;
  address?: string;
  logoUrl?: string;
  registrationNumber?: string;
}

export interface UpdateOrganizationDto {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  registrationNumber?: string;
}

export interface OrganizationQueryFilters {
  type?: OrgType;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}