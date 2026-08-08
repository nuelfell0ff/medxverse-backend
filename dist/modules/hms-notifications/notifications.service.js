import { Types } from 'mongoose';
import { NotificationModel } from './notifications.model.js';
export class NotificationsService {
    async createNotification(hmoId, input) {
        const notificationData = {
            ...input,
            hmoId: new Types.ObjectId(hmoId),
            recipientId: new Types.ObjectId(input.recipientId),
        };
        return await NotificationModel.create(notificationData);
    }
    async getUserNotifications(hmoId, recipientId, filters) {
        const page = Math.max(1, filters.page || 1);
        const limit = Math.max(1, Math.min(100, filters.limit || 20));
        const skip = (page - 1) * limit;
        const query = {
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
    async getNotificationById(id, hmoId, recipientId) {
        return await NotificationModel.findOne({
            _id: new Types.ObjectId(id),
            hmoId: new Types.ObjectId(hmoId),
            recipientId: new Types.ObjectId(recipientId),
        }).exec();
    }
    async markAsRead(id, hmoId, recipientId) {
        return await NotificationModel.findOneAndUpdate({
            _id: new Types.ObjectId(id),
            hmoId: new Types.ObjectId(hmoId),
            recipientId: new Types.ObjectId(recipientId),
        }, {
            $set: {
                isRead: true,
                readAt: new Date(),
            },
        }, { new: true }).exec();
    }
    async markAllAsRead(hmoId, recipientId) {
        const result = await NotificationModel.updateMany({
            hmoId: new Types.ObjectId(hmoId),
            recipientId: new Types.ObjectId(recipientId),
            isRead: false,
        }, {
            $set: {
                isRead: true,
                readAt: new Date(),
            },
        }).exec();
        return result.modifiedCount;
    }
    async getUnreadCount(hmoId, recipientId) {
        return await NotificationModel.countDocuments({
            hmoId: new Types.ObjectId(hmoId),
            recipientId: new Types.ObjectId(recipientId),
            isRead: false,
        });
    }
}
export const notificationsService = new NotificationsService();
