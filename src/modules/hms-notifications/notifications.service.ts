import { Types } from 'mongoose';
import { NotificationModel } from './notifications.model.js';
import {
  CreateNotificationInput,
  INotificationDocument,
  NotificationQueryFilters,
  PaginatedNotificationsResult,
} from './notifications.types.js';

export class NotificationsService {
  public async createNotification(
    hmoId: string,
    input: CreateNotificationInput
  ): Promise<INotificationDocument> {
    const notificationData = {
      ...input,
      hmoId: new Types.ObjectId(hmoId),
      recipientId: new Types.ObjectId(input.recipientId),
    };

    return await NotificationModel.create(notificationData);
  }

  public async getUserNotifications(
    hmoId: string,
    recipientId: string,
    filters: NotificationQueryFilters
  ): Promise<PaginatedNotificationsResult> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      hmoId: new Types.ObjectId(hmoId),
      recipientId: new Types.ObjectId(recipientId),
    };

    if (typeof filters.isRead === 'boolean') {
      query.isRead = filters.isRead;
    }

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.channel) {
      query.channel = filters.channel;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      NotificationModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      NotificationModel.countDocuments(query),
      NotificationModel.countDocuments({
        hmoId: new Types.ObjectId(hmoId),
        recipientId: new Types.ObjectId(recipientId),
        isRead: false,
      }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getNotificationById(
    id: string,
    hmoId: string,
    recipientId: string
  ): Promise<INotificationDocument | null> {
    return await NotificationModel.findOne({
      _id: new Types.ObjectId(id),
      hmoId: new Types.ObjectId(hmoId),
      recipientId: new Types.ObjectId(recipientId),
    }).exec();
  }

  public async markAsRead(
    id: string,
    hmoId: string,
    recipientId: string
  ): Promise<INotificationDocument | null> {
    return await NotificationModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        hmoId: new Types.ObjectId(hmoId),
        recipientId: new Types.ObjectId(recipientId),
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
      { new: true }
    ).exec();
  }

  public async markAllAsRead(hmoId: string, recipientId: string): Promise<number> {
    const result = await NotificationModel.updateMany(
      {
        hmoId: new Types.ObjectId(hmoId),
        recipientId: new Types.ObjectId(recipientId),
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    ).exec();

    return result.modifiedCount;
  }

  public async getUnreadCount(hmoId: string, recipientId: string): Promise<number> {
    return await NotificationModel.countDocuments({
      hmoId: new Types.ObjectId(hmoId),
      recipientId: new Types.ObjectId(recipientId),
      isRead: false,
    });
  }
}

export const notificationsService = new NotificationsService();