import { Document, Types } from 'mongoose';

export enum NotificationType {
  APPOINTMENT = 'APPOINTMENT',
  LAB_RESULT = 'LAB_RESULT',
  EMERGENCY = 'EMERGENCY',
  PRESCRIPTION = 'PRESCRIPTION',
  SYSTEM = 'SYSTEM',
  BILLING = 'BILLING',
  GENERAL = 'GENERAL',
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

export enum NotificationStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED',
}

export interface INotification {
  hospitalId: Types.ObjectId;
  recipientId: Types.ObjectId;
  senderId?: Types.ObjectId;
  type: NotificationType;
  priority: NotificationPriority;
  channel: NotificationChannel;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  status: NotificationStatus;
  readAt?: Date;
  expiresAt?: Date;
}

export interface INotificationDocument extends INotification, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotificationInput {
  hospitalId: string;
  recipientId: string;
  senderId?: string;
  type: NotificationType;
  priority?: NotificationPriority;
  channel?: NotificationChannel;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  expiresAt?: Date;
}

export interface GetNotificationsQuery {
  page?: number;
  limit?: number;
  status?: NotificationStatus;
  type?: NotificationType;
}

export interface PaginatedNotifications {
  notifications: INotificationDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}