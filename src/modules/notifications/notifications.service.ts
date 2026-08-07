import { NotificationModel } from './notifications.model.js';
import {
  CreateNotificationInput,
  GetNotificationsQuery,
  INotificationDocument,
  NotificationStatus,
  PaginatedNotifications,
} from './notifications.types.js';

export class NotificationService {
  /**
   * Create and deliver a new notification
   */
  public async createNotification(
    input: CreateNotificationInput
  ): Promise<INotificationDocument> {
    const notification = await NotificationModel.create({
      ...input,
      status: NotificationStatus.UNREAD,
    });

    return notification;
  }

  /**
   * Get paginated notifications for a recipient
   */
  public async getUserNotifications(
    userId: string,
    hospitalId: string,
    query: GetNotificationsQuery
  ): Promise<PaginatedNotifications> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      recipientId: userId,
      hospitalId,
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.type) {
      filter.type = query.type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      NotificationModel.find(filter)
        .populate('senderId', 'firstName lastName role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      NotificationModel.countDocuments(filter),
      NotificationModel.countDocuments({
        recipientId: userId,
        hospitalId,
        status: NotificationStatus.UNREAD,
      }),
    ]);

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    };
  }

  /**
   * Get total unread count for a user
   */
  public async getUnreadCount(userId: string, hospitalId: string): Promise<number> {
    return NotificationModel.countDocuments({
      recipientId: userId,
      hospitalId,
      status: NotificationStatus.UNREAD,
    });
  }

  /**
   * Mark a single notification as read
   */
  public async markAsRead(
    notificationId: string,
    userId: string,
    hospitalId: string
  ): Promise<INotificationDocument | null> {
    return NotificationModel.findOneAndUpdate(
      {
        _id: notificationId,
        recipientId: userId,
        hospitalId,
      },
      {
        $set: {
          status: NotificationStatus.READ,
          readAt: new Date(),
        },
      },
      { new: true }
    ).exec();
  }

  /**
   * Mark all notifications for a user as read
   */
  public async markAllAsRead(userId: string, hospitalId: string): Promise<number> {
    const result = await NotificationModel.updateMany(
      {
        recipientId: userId,
        hospitalId,
        status: NotificationStatus.UNREAD,
      },
      {
        $set: {
          status: NotificationStatus.READ,
          readAt: new Date(),
        },
      }
    ).exec();

    return result.modifiedCount;
  }

  /**
   * Delete or archive a notification
   */
  public async deleteNotification(
    notificationId: string,
    userId: string,
    hospitalId: string
  ): Promise<boolean> {
    const result = await NotificationModel.deleteOne({
      _id: notificationId,
      recipientId: userId,
      hospitalId,
    }).exec();

    return result.deletedCount > 0;
  }
}

export const notificationService = new NotificationService();