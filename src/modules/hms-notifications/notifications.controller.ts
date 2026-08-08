import { Request, Response, NextFunction } from 'express';
import { notificationsService } from './notifications.service.js';
import { NotificationChannel, NotificationType } from './notifications.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hmoId: string;
    [key: string]: unknown;
  };
}

export class NotificationsController {
  public async createNotification(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;

      const notification = await notificationsService.createNotification(
        hmoId,
        req.body
      );
      res.status(201).json({ success: true, data: notification });
    } catch (error) {
      next(error);
    }
  }

  public async getUserNotifications(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;
      const recipientId = authReq.user._id;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const isRead =
        req.query.isRead !== undefined ? req.query.isRead === 'true' : undefined;
      const type = req.query.type as NotificationType | undefined;
      const channel = req.query.channel as NotificationChannel | undefined;

      const result = await notificationsService.getUserNotifications(
        hmoId,
        recipientId,
        { page, limit, isRead, type, channel }
      );

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async getNotificationById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;
      const recipientId = authReq.user._id;
      const id = req.params.id as string;

      const notification = await notificationsService.getNotificationById(
        id,
        hmoId,
        recipientId
      );

      if (!notification) {
        res.status(404).json({ success: false, message: 'Notification not found' });
        return;
      }

      res.status(200).json({ success: true, data: notification });
    } catch (error) {
      next(error);
    }
  }

  public async markAsRead(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;
      const recipientId = authReq.user._id;
      const id = req.params.id as string;

      const updated = await notificationsService.markAsRead(id, hmoId, recipientId);
      if (!updated) {
        res.status(404).json({ success: false, message: 'Notification not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async markAllAsRead(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;
      const recipientId = authReq.user._id;

      const count = await notificationsService.markAllAsRead(hmoId, recipientId);
      res.status(200).json({
        success: true,
        message: `${count} notifications marked as read`,
      });
    } catch (error) {
      next(error);
    }
  }

  public async getUnreadCount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hmoId = authReq.user.hmoId;
      const recipientId = authReq.user._id;

      const unreadCount = await notificationsService.getUnreadCount(
        hmoId,
        recipientId
      );
      res.status(200).json({ success: true, data: { unreadCount } });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationsController = new NotificationsController();