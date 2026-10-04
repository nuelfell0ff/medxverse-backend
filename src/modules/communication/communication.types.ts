import { Document, Types } from 'mongoose';

export enum ConversationType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
  DEPARTMENT = 'DEPARTMENT',
  PATIENT_CARE = 'PATIENT_CARE',
  SUPPORT = 'SUPPORT',
}

export enum ParticipantType {
  STAFF = 'STAFF',
  PATIENT = 'PATIENT',
  AGENT = 'AGENT',
  AI = 'AI',
  SYSTEM = 'SYSTEM',
}

export enum MessageType {
  TEXT = 'TEXT',
  FILE = 'FILE',
  IMAGE = 'IMAGE',
  SYSTEM = 'SYSTEM',
}

export enum ConversationPriority {
  NORMAL = 'NORMAL',
  IMPORTANT = 'IMPORTANT',
  URGENT = 'URGENT',
  CRITICAL = 'CRITICAL',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING = 'WAITING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum TicketCategory {
  GENERAL = 'GENERAL',
  CLINICAL = 'CLINICAL',
  APPOINTMENT = 'APPOINTMENT',
  LABORATORY = 'LABORATORY',
  PHARMACY = 'PHARMACY',
  BILLING = 'BILLING',
  INSURANCE = 'INSURANCE',
  MEDICAL_RECORDS = 'MEDICAL_RECORDS',
  TECHNICAL = 'TECHNICAL',
}

export interface IConversationParticipant {
  type: ParticipantType;
  userId?: Types.ObjectId;
  patientId?: Types.ObjectId;
  joinedAt: Date;
  lastReadAt?: Date;
  muted?: boolean;
}

export interface IConversation {
  hospitalId: Types.ObjectId;
  type: ConversationType;
  title?: string;
  departmentId?: Types.ObjectId;
  patientId?: Types.ObjectId;
  directKey?: string;
  participants: IConversationParticipant[];
  priority: ConversationPriority;
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  createdBy?: Types.ObjectId;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IConversationDocument extends IConversation, Document {
  _id: Types.ObjectId;
}

export interface IMessageAttachment {
  url: string;
  name: string;
  mimeType: string;
  size?: number;
}

export interface IMessageReadReceipt {
  userId: Types.ObjectId;
  readAt: Date;
}

export interface IMessage {
  hospitalId: Types.ObjectId;
  conversationId: Types.ObjectId;
  senderType: ParticipantType;
  senderUserId?: Types.ObjectId;
  body?: string;
  type: MessageType;
  attachments: IMessageAttachment[];
  readBy: IMessageReadReceipt[];
  editedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessageDocument extends IMessage, Document {
  _id: Types.ObjectId;
}

export interface ITicket {
  hospitalId: Types.ObjectId;
  conversationId?: Types.ObjectId;
  patientId?: Types.ObjectId;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: Types.ObjectId;
  assignedDepartmentId?: Types.ObjectId;
  createdBy: Types.ObjectId;
  description?: string;
  escalationReason?: string;
  escalatedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITicketDocument extends ITicket, Document {
  _id: Types.ObjectId;
}
