import { Document, Types } from 'mongoose';

export enum NotificationType {
  CLAIM_STATUS = 'CLAIM_STATUS',
  PRE_AUTH_STATUS = 'PRE_AUTH_STATUS',
  PAYMENT_DISBURSED = 'PAYMENT_DISBURSED',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  POLICY_EXPIRING = 'POLICY_EXPIRING',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  READ = 'READ',
}

export interface INotificationDocument extends Document {
  _id: Types.ObjectId;
  hmoId: Types.ObjectId;
  recipientId: Types.ObjectId;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  status: NotificationStatus;
  isRead: boolean;
  readAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotificationInput {
  recipientId: string;
  type: NotificationType;
  channel?: NotificationChannel;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationQueryFilters {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: NotificationType;
  channel?: NotificationChannel;
}

export interface PaginatedNotificationsResult {
  notifications: INotificationDocument[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}