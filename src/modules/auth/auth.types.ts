import { Document, Types } from 'mongoose';

export enum AccountType {
  HOSPITAL = 'HOSPITAL',
  HMO = 'HMO',
}

// Added missing JWT payload interface
export interface AuthUserPayload {
  id: string;
  email: string;
  accountType: AccountType;
  role?: string;
  hospitalId?: string;
}

export interface IAccount {
  name: string;
  email: string;
  password?: string;
  accountType: AccountType;
  code?: string;
  phone: string;
  address?: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAccountDocument extends IAccount, Document {
  _id: Types.ObjectId;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface RegisterAccountDTO {
  name: string;
  email: string;
  password: string;
  accountType: AccountType;
  code?: string;
  phone: string;
  address?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  account: {
    id: string;
    name: string;
    email: string;
    accountType: AccountType;
    code?: string;
    phone: string;
    address?: string;
    logoUrl?: string;
  };
}