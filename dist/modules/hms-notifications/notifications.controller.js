import { notificationsService } from './notifications.service.js';
export class NotificationsController {
    async createNotification(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const notification = await notificationsService.createNotification(hmoId, req.body);
            res.status(201).json({ success: true, data: notification });
        }
        catch (error) {
            next(error);
        }
    }
    async getUserNotifications(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const recipientId = authReq.user._id;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const isRead = req.query.isRead !== undefined ? req.query.isRead === 'true' : undefined;
            const type = req.query.type;
            const channel = req.query.channel;
            const result = await notificationsService.getUserNotifications(hmoId, recipientId, { page, limit, isRead, type, channel });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getNotificationById(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const recipientId = authReq.user._id;
            const id = req.params.id;
            const notification = await notificationsService.getNotificationById(id, hmoId, recipientId);
            if (!notification) {
                res.status(404).json({ success: false, message: 'Notification not found' });
                return;
            }
            res.status(200).json({ success: true, data: notification });
        }
        catch (error) {
            next(error);
        }
    }
    async markAsRead(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const recipientId = authReq.user._id;
            const id = req.params.id;
            const updated = await notificationsService.markAsRead(id, hmoId, recipientId);
            if (!updated) {
                res.status(404).json({ success: false, message: 'Notification not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async markAllAsRead(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const recipientId = authReq.user._id;
            const count = await notificationsService.markAllAsRead(hmoId, recipientId);
            res.status(200).json({
                success: true,
                message: `${count} notifications marked as read`,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getUnreadCount(req, res, next) {
        try {
            const authReq = req;
            const hmoId = authReq.user.hmoId;
            const recipientId = authReq.user._id;
            const unreadCount = await notificationsService.getUnreadCount(hmoId, recipientId);
            res.status(200).json({ success: true, data: { unreadCount } });
        }
        catch (error) {
            next(error);
        }
    }
}
export const notificationsController = new NotificationsController();
