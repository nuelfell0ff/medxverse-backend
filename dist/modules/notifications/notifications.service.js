import { NotificationModel } from './notifications.model.js';
import { NotificationStatus, } from './notifications.types.js';
export class NotificationService {
    /**
     * Create and deliver a new notification
     */
    async createNotification(input) {
        const notification = await NotificationModel.create({
            ...input,
            status: NotificationStatus.UNREAD,
        });
        return notification;
    }
    /**
     * Get paginated notifications for a recipient
     */
    async getUserNotifications(userId, hospitalId, query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(50, Math.max(1, query.limit || 20));
        const skip = (page - 1) * limit;
        const filter = {
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
    async getUnreadCount(userId, hospitalId) {
        return NotificationModel.countDocuments({
            recipientId: userId,
            hospitalId,
            status: NotificationStatus.UNREAD,
        });
    }
    /**
     * Mark a single notification as read
     */
    async markAsRead(notificationId, userId, hospitalId) {
        return NotificationModel.findOneAndUpdate({
            _id: notificationId,
            recipientId: userId,
            hospitalId,
        }, {
            $set: {
                status: NotificationStatus.READ,
                readAt: new Date(),
            },
        }, { new: true }).exec();
    }
    /**
     * Mark all notifications for a user as read
     */
    async markAllAsRead(userId, hospitalId) {
        const result = await NotificationModel.updateMany({
            recipientId: userId,
            hospitalId,
            status: NotificationStatus.UNREAD,
        }, {
            $set: {
                status: NotificationStatus.READ,
                readAt: new Date(),
            },
        }).exec();
        return result.modifiedCount;
    }
    /**
     * Delete or archive a notification
     */
    async deleteNotification(notificationId, userId, hospitalId) {
        const result = await NotificationModel.deleteOne({
            _id: notificationId,
            recipientId: userId,
            hospitalId,
        }).exec();
        return result.deletedCount > 0;
    }
}
export const notificationService = new NotificationService();
