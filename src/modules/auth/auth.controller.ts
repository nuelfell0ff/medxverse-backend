import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export class AuthController {
  /**
   * Handles User Authentication Login
   * POST /api/v1/auth/login
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body);
      res.status(200).json(new ApiResponse(200, result, 'User logged in successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handles Token Refreshing
   * POST /api/v1/auth/refresh
   */
  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refreshSession(refreshToken);
      res.status(200).json(new ApiResponse(200, result, 'Access token refreshed successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Returns Current Authenticated User Profile
   * GET /api/v1/auth/me
   */
  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const user = await AuthService.getCurrentUser(userId);
      res.status(200).json(new ApiResponse(200, user, 'Current user profile retrieved'));
    } catch (error) {
      next(error);
    }
  }
}