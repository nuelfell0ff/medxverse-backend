import { Document, Types } from 'mongoose';

export enum WorkTaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  OVERDUE = 'OVERDUE',
}

export enum WorkTaskPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum WorkTaskCategory {
  GENERAL = 'GENERAL',
  CLINICAL = 'CLINICAL',
  FOLLOW_UP = 'FOLLOW_UP',
  REVIEW = 'REVIEW',
  DOCUMENTATION = 'DOCUMENTATION',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
}

export enum WorkTicketStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING = 'WAITING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum WorkTicketPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  CRITICAL = 'CRITICAL',
}

export enum WorkTicketCategory {
  PATIENT = 'PATIENT',
  CLINICAL = 'CLINICAL',
  APPOINTMENT = 'APPOINTMENT',
  LABORATORY = 'LABORATORY',
  RADIOLOGY = 'RADIOLOGY',
  PHARMACY = 'PHARMACY',
  SURGERY = 'SURGERY',
  EMERGENCY = 'EMERGENCY',
  TECHNICAL = 'TECHNICAL',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
  OTHER = 'OTHER',
}

export type WorkModuleKey =
  | 'patients'
  | 'emergency'
  | 'icu'
  | 'bed_ward'
  | 'outpatient'
  | 'surgery'
  | 'radiology'
  | 'lab'
  | 'appointments'
  | 'pharmacy'
  | 'rostering'
  | 'other';

export interface IWorkTask {
  hospitalId: Types.ObjectId;
  title: string;
  description?: string;
  category: WorkTaskCategory;
  priority: WorkTaskPriority;
  status: WorkTaskStatus;
  assignedTo: Types.ObjectId;
  createdByUserId: Types.ObjectId;
  createdByStaffId?: Types.ObjectId;
  patientId?: Types.ObjectId;
  relatedModule?: WorkModuleKey;
  relatedRecordId?: Types.ObjectId;
  dueAt?: Date;
  completedAt?: Date;
  completedBy?: Types.ObjectId;
  cancelledAt?: Date;
  cancelledBy?: Types.ObjectId;
}

export interface IWorkTaskDocument extends IWorkTask, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorkTicketComment {
  authorUserId: Types.ObjectId;
  authorStaffId?: Types.ObjectId;
  body: string;
  createdAt: Date;
}

export interface IWorkTicket {
  hospitalId: Types.ObjectId;
  ticketNumber: string;
  subject: string;
  description: string;
  category: WorkTicketCategory;
  priority: WorkTicketPriority;
  status: WorkTicketStatus;
  requesterUserId: Types.ObjectId;
  requesterStaffId?: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  patientId?: Types.ObjectId;
  relatedModule?: WorkModuleKey;
  relatedRecordId?: Types.ObjectId;
  comments: IWorkTicketComment[];
  resolvedAt?: Date;
  closedAt?: Date;
}

export interface IWorkTicketDocument extends IWorkTicket, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkActivityPatient {
  id: string;
  mrn?: string;
  name?: string;
}

export interface WorkActivity {
  id: string;
  sourceModule: WorkModuleKey;
  sourceType: string;
  sourceRecordId: string;
  title: string;
  summary: string;
  status?: string;
  priority?: string;
  occurredAt: string;
  patient?: WorkActivityPatient;
  readOnly: true;
  details: Record<string, unknown>;
}
