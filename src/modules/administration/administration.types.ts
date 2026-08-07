import { Document, Types } from 'mongoose';

export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT',
  MFA_VERIFY = 'MFA_VERIFY',
}

export interface IBranch {
  hospitalId: Types.ObjectId;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  isActive: boolean;
}

export interface IBranchDocument extends IBranch, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IRole {
  hospitalId: Types.ObjectId;
  name: string;
  description?: string;
  permissions: string[]; // List of granular access strings (e.g., 'patients:read', 'billing:write')
  isSystemDefault: boolean;
}

export interface IRoleDocument extends IRole, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuditEvent {
  hospitalId: Types.ObjectId;
  userId: Types.ObjectId;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  payload?: Record<string, unknown>;
  timestamp: Date;
}

export interface IAuditEventDocument extends IAuditEvent, Document {}

export interface IDeviceSession {
  hospitalId: Types.ObjectId;
  userId: Types.ObjectId;
  deviceId: string;
  deviceType?: string;
  ipAddress?: string;
  lastActiveAt: Date;
  isRevoked: boolean;
}

export interface IDeviceSessionDocument extends IDeviceSession, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBranchInput {
  hospitalId: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
}

export interface CreateRoleInput {
  hospitalId: string;
  name: string;
  description?: string;
  permissions: string[];
}

export interface LogAuditEventInput {
  hospitalId: string;
  userId: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  payload?: Record<string, unknown>;
}

export interface GetAuditLogsQuery {
  page?: number;
  limit?: number;
  userId?: string;
  action?: AuditAction;
  resource?: string;
}