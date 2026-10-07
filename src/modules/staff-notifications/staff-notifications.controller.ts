import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware.js';
import { StaffNotificationsService } from './staff-notifications.service.js';

function requireStaff(req: AuthRequest): { hospitalId: string; userId: string } {
  const hospitalId = req.user?.hospitalId || req.account?.accountId;
  const userId = req.user?._id;
  if (!hospitalId || !userId || req.user?.userType !== 'STAFF') {
    throw new Error('An authenticated staff account is required');
  }
  return { hospitalId: String(hospitalId), userId: String(userId) };
}

export class StaffNotificationsController {
  static async feed(req: AuthRequest, res: Response) {
    try {
      const { hospitalId, userId } = requireStaff(req);
      const data = await StaffNotificationsService.getFeed(
        hospitalId,
        userId,
        Number(req.query.windowMinutes) || 24 * 60,
        Number(req.query.limit) || 50,
      );
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(error.message.includes('authenticated') ? 401 : 400).json({ success: false, message: error.message });
    }
  }

  static async unreadCount(req: AuthRequest, res: Response) {
    try {
      const { hospitalId, userId } = requireStaff(req);
      const unreadCount = await StaffNotificationsService.getUnreadCount(hospitalId, userId);
      res.json({ success: true, data: { unreadCount } });
    } catch (error: any) {
      res.status(error.message.includes('authenticated') ? 401 : 400).json({ success: false, message: error.message });
    }
  }
}
