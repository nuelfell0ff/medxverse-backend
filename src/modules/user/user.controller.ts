import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export class UserController {
  /**
   * Onboards a new staff member
   * POST /api/v1/users
   */
  static async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.createUser(req.body, req.user!.organizationId);
      res.status(201).json(new ApiResponse(201, user, 'Staff member registered successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lists staff members for current organization
   * GET /api/v1/users
   */
  static async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        role: req.query.role as any,
        department: req.query.department as string,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        search: req.query.search as string,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      };

      const result = await UserService.getUsersByOrganization(
        req.user!.organizationId,
        filters
      );
      res.status(200).json(new ApiResponse(200, result, 'Staff directory retrieved'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets staff member details by ID
   * GET /api/v1/users/:id
   */
  static async getUserById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await UserService.getUserById(req.params.id, req.user!.organizationId);
      res.status(200).json(new ApiResponse(200, user, 'Staff profile retrieved'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates staff profile
   * PATCH /api/v1/users/:id
   */
  static async updateUser(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const updatedUser = await UserService.updateUser(
        req.params.id,
        req.body,
        req.user!.organizationId
      );
      res.status(200).json(new ApiResponse(200, updatedUser, 'Staff profile updated'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggles staff active state
   * PATCH /api/v1/users/:id/toggle-status
   */
  static async toggleUserStatus(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await UserService.toggleUserStatus(
        req.params.id,
        req.user!.organizationId
      );
      res.status(200).json(new ApiResponse(200, result, 'Staff account status updated'));
    } catch (error) {
      next(error);
    }
  }
}