import { Request, Response, NextFunction } from 'express';
import { HMOService } from './hmo.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export class HMOController {
  // ==========================================
  // HMO PROVIDER CONTROLLER ENDPOINTS
  // ==========================================

  /**
   * POST /api/v1/hmo/providers
   */
  static async createProvider(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const provider = await HMOService.createProvider(req.body, req.user!.organizationId);
      res.status(201).json(new ApiResponse(201, provider, 'HMO Provider registered successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/hmo/providers
   */
  static async getProviders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const isActive = req.query.isActive !== 'false';
      const providers = await HMOService.getProviders(req.user!.organizationId, isActive);
      res.status(200).json(new ApiResponse(200, providers, 'HMO Providers fetched successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/hmo/providers/:id
   */
  static async getProviderById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const provider = await HMOService.getProviderById(req.params.id, req.user!.organizationId);
      res.status(200).json(new ApiResponse(200, provider, 'HMO Provider details retrieved'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/hmo/providers/:id
   */
  static async updateProvider(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const provider = await HMOService.updateProvider(
        req.params.id,
        req.body,
        req.user!.organizationId
      );
      res.status(200).json(new ApiResponse(200, provider, 'HMO Provider updated successfully'));
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // PRE-AUTHORIZATION CONTROLLER ENDPOINTS
  // ==========================================

  /**
   * POST /api/v1/hmo/pre-auths
   */
  static async createPreAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const preAuth = await HMOService.createPreAuth(
        req.body,
        req.user!.id,
        req.user!.organizationId
      );
      res.status(201).json(new ApiResponse(201, preAuth, 'Pre-authorization request submitted'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/hmo/pre-auths
   */
  static async getPreAuths(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        hmoProviderId: req.query.hmoProviderId as string,
        patientId: req.query.patientId as string,
        status: req.query.status as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      };

      const result = await HMOService.getPreAuths(req.user!.organizationId, filters);
      res.status(200).json(new ApiResponse(200, result, 'Pre-authorizations retrieved'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/hmo/pre-auths/:id/status
   */
  static async updatePreAuthStatus(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const preAuth = await HMOService.updatePreAuthStatus(
        req.params.id,
        req.body,
        req.user!.organizationId
      );
      res.status(200).json(new ApiResponse(200, preAuth, 'Pre-authorization status updated'));
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // CLAIMS CONTROLLER ENDPOINTS
  // ==========================================

  /**
   * POST /api/v1/hmo/claims
   */
  static async createClaim(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const claim = await HMOService.createClaim(
        req.body,
        req.user!.id,
        req.user!.organizationId
      );
      res.status(201).json(new ApiResponse(201, claim, 'HMO Claim submitted successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/hmo/claims
   */
  static async getClaims(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        hmoProviderId: req.query.hmoProviderId as string,
        patientId: req.query.patientId as string,
        status: req.query.status as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      };

      const result = await HMOService.getClaims(req.user!.organizationId, filters);
      res.status(200).json(new ApiResponse(200, result, 'Claims retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/hmo/claims/:id
   */
  static async getClaimById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const claim = await HMOService.getClaimById(req.params.id, req.user!.organizationId);
      res.status(200).json(new ApiResponse(200, claim, 'Claim details retrieved'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/hmo/claims/:id/status
   */
  static async updateClaimStatus(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const claim = await HMOService.updateClaimStatus(
        req.params.id,
        req.body,
        req.user!.organizationId
      );
      res.status(200).json(new ApiResponse(200, claim, 'Claim status updated successfully'));
    } catch (error) {
      next(error);
    }
  }
}