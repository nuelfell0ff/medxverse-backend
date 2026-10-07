import { Request, Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware.js';
import { StaffAuthService } from './staff-auth.service.js';

export class StaffAuthController {
  static async createInvitation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;
      const staffId = String(req.params.staffId);
      if (!hospitalId) {
        res.status(401).json({ success: false, message: 'Hospital context is required' });
        return;
      }

      const result = await StaffAuthService.createInvitation(hospitalId, staffId, req.user?._id);
      res.status(201).json({
        success: true,
        message: result.sent ? 'Staff invitation sent successfully' : 'Invitation created. Configure an email provider to send it automatically.',
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to create invitation' });
    }
  }

  static async previewInvitation(req: Request, res: Response): Promise<void> {
    try {
      const result = await StaffAuthService.getInvitation(String(req.params.token));
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Invalid invitation' });
    }
  }

  static async acceptInvitation(req: Request, res: Response): Promise<void> {
    try {
      const result = await StaffAuthService.acceptInvitation(req.body);
      res.status(201).json({ success: true, message: 'Staff account activated successfully', data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to activate staff account' });
    }
  }


  static async me(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const hospitalId = req.user?.hospitalId || req.account?.accountId;
      if (!userId || !hospitalId || req.user?.userType !== 'STAFF') {
        res.status(401).json({ success: false, message: 'Authenticated staff context is required' });
        return;
      }
      const result = await StaffAuthService.getProfile(String(userId), String(hospitalId));
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to load staff profile' });
    }
  }

  static async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const hospitalId = req.user?.hospitalId || req.account?.accountId;
      if (!userId || !hospitalId || req.user?.userType !== 'STAFF') {
        res.status(401).json({ success: false, message: 'Authenticated staff context is required' });
        return;
      }
      const result = await StaffAuthService.updateProfile(String(userId), String(hospitalId), req.body || {});
      res.status(200).json({ success: true, message: 'Profile updated successfully', data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to update staff profile' });
    }
  }

  static async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const hospitalId = req.user?.hospitalId || req.account?.accountId;
      if (!userId || !hospitalId || req.user?.userType !== 'STAFF') {
        res.status(401).json({ success: false, message: 'Authenticated staff context is required' });
        return;
      }
      const result = await StaffAuthService.changePassword(String(userId), String(hospitalId), req.body || {});
      res.status(200).json({ success: true, message: 'Password changed successfully', data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to change password' });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await StaffAuthService.login(req.body);
      res.status(200).json({ success: true, message: 'Staff login successful', data: result });
    } catch (error: any) {
      res.status(401).json({ success: false, message: error.message || 'Authentication failed' });
    }
  }
}
