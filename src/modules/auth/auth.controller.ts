import { Request, Response } from 'express';
import { AuthService } from './auth.service.js';

export class AuthController {
  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const result = await AuthService.register(req.body);

      res.status(201).json({
        success: true,
        message: 'Account registered successfully',
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Registration failed',
      });
    }
  }

  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await AuthService.login(req.body);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error.message || 'Authentication failed',
      });
    }
  }

  public static async me(req: Request, res: Response): Promise<void> {
    try {
      const accountId = (req as any).account?.accountId;

      if (!accountId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const profile = await AuthService.getProfile(String(accountId));

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'Failed to fetch account profile',
      });
    }
  }

  public static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const accountId = (req as any).account?.accountId;

      if (!accountId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const profile = await AuthService.updateProfile(
        String(accountId),
        req.body || {}
      );

      res.status(200).json({
        success: true,
        message: 'Account profile updated successfully',
        data: profile,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update account profile',
      });
    }
  }

  public static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const accountId = (req as any).account?.accountId;

      if (!accountId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const result = await AuthService.changePassword(
        String(accountId),
        req.body || {}
      );

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to change password',
      });
    }
  }
}
