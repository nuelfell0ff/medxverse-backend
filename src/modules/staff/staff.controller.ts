import { Response } from 'express';

import { AuthRequest } from '../../middlewares/auth.middleware.js';

import { StaffService } from './staff.service.js';

import {
  StaffCategory,
  StaffClassification,
  StaffRole,
  StaffStatus,
} from './staff.types.js';

export class StaffController {
  /**
   * POST /
   */
  public static async createStaff(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;

      if (!hospitalId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const staff = await StaffService.createStaff(
        hospitalId,
        req.body
      );

      res.status(201).json({
        success: true,
        message: 'Healthcare worker created successfully',
        data: staff,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message:
          error.message ||
          'Failed to create healthcare worker',
      });
    }
  }

  /**
   * GET /
   */
  public static async getStaff(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;

      if (!hospitalId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const {
        role,
        category,
        classification,
        departmentId,
        unitId,
        status,
        search,
        isActive,
      } = req.query;

      const filters = {
        role: role
          ? (String(role) as StaffRole)
          : undefined,

        category: category
          ? (String(category) as StaffCategory)
          : undefined,

        classification: classification
          ? (String(classification) as StaffClassification)
          : undefined,

        departmentId: departmentId
          ? String(departmentId)
          : undefined,

        unitId: unitId
          ? String(unitId)
          : undefined,

        status: status
          ? (String(status) as StaffStatus)
          : undefined,

        search: search
          ? String(search)
          : undefined,

        isActive:
          isActive !== undefined
            ? String(isActive) === 'true'
            : undefined,
      };

      const staff =
        await StaffService.getHospitalStaff(
          hospitalId,
          filters
        );

      res.status(200).json({
        success: true,
        count: staff.length,
        data: staff,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message:
          error.message ||
          'Failed to fetch staff list',
      });
    }
  }

  /**
   * GET /dashboard
   */
  public static async getDashboard(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;

      if (!hospitalId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const dashboard =
        await StaffService.getStaffDashboard(
          hospitalId
        );

      res.status(200).json({
        success: true,
        data: dashboard,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message:
          error.message ||
          'Failed to fetch staff dashboard',
      });
    }
  }

  /**
   * GET /credentials/expiring
   */
  public static async getExpiringCredentials(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;

      if (!hospitalId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const days = req.query.days
        ? Number(req.query.days)
        : 30;

      const credentials =
        await StaffService.getExpiringCredentials(
          hospitalId,
          Number.isFinite(days) ? days : 30
        );

      res.status(200).json({
        success: true,
        count: credentials.length,
        data: credentials,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message:
          error.message ||
          'Failed to fetch expiring credentials',
      });
    }
  }

  /**
   * GET /:id
   */
  public static async getStaffById(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;

      if (!hospitalId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const id = String(req.params.id);

      const staff =
        await StaffService.getStaffById(
          id,
          hospitalId
        );

      res.status(200).json({
        success: true,
        data: staff,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message:
          error.message ||
          'Staff member not found',
      });
    }
  }

  /**
   * PATCH /:id
   */
  public static async updateStaff(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;

      if (!hospitalId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const id = String(req.params.id);

      const staff =
        await StaffService.updateStaff(
          id,
          hospitalId,
          req.body
        );

      res.status(200).json({
        success: true,
        message: 'Healthcare worker updated successfully',
        data: staff,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message:
          error.message ||
          'Failed to update healthcare worker',
      });
    }
  }

  /**
   * PATCH /:id/toggle-status
   */
  public static async toggleStaffStatus(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    try {
      const hospitalId = req.account?.accountId;

      if (!hospitalId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const id = String(req.params.id);

      const staff =
        await StaffService.toggleStaffStatus(
          id,
          hospitalId
        );

      res.status(200).json({
        success: true,
        message: `Staff status updated to ${
          staff.isActive
            ? 'Active'
            : 'Inactive'
        }`,
        data: staff,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message:
          error.message ||
          'Failed to update staff status',
      });
    }
  }
}