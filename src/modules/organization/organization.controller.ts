import { Request, Response, NextFunction } from 'express';
import { OrganizationService } from './organization.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export class OrganizationController {
  /**
   * Registers a new organization (Hospital / HMO)
   * POST /api/v1/organizations
   */
  static async createOrganization(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const organization = await OrganizationService.createOrganization(req.body);
      res
        .status(201)
        .json(new ApiResponse(201, organization, 'Organization created successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fetches list of all organizations
   * GET /api/v1/organizations
   */
  static async getOrganizations(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const filters = {
        type: req.query.type as any,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        search: req.query.search as string,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      };

      const result = await OrganizationService.getOrganizations(filters);
      res
        .status(200)
        .json(new ApiResponse(200, result, 'Organizations list retrieved'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets detailed organization profile by ID
   * GET /api/v1/organizations/:id
   */
  static async getOrganizationById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const organization = await OrganizationService.getOrganizationById(
        req.params.id
      );
      res
        .status(200)
        .json(new ApiResponse(200, organization, 'Organization profile retrieved'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates organization details
   * PATCH /api/v1/organizations/:id
   */
  static async updateOrganization(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const updatedOrg = await OrganizationService.updateOrganization(
        req.params.id,
        req.body
      );
      res
        .status(200)
        .json(new ApiResponse(200, updatedOrg, 'Organization updated successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deactivates or Reactivates an organization
   * PATCH /api/v1/organizations/:id/toggle-status
   */
  static async toggleOrganizationStatus(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await OrganizationService.toggleOrganizationStatus(
        req.params.id
      );
      res
        .status(200)
        .json(
          new ApiResponse(200, result, 'Organization active status toggled successfully')
        );
    } catch (error) {
      next(error);
    }
  }
}