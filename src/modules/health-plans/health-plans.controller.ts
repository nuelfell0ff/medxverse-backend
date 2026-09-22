import { Request, Response } from 'express';

import { healthPlansService } from './health-plans.service.js';

import {
  BenefitCategory,
  BenefitStatus,
  HealthPlanStatus,
  HealthPlanType,
  CreateHealthPlanInput,
  AttachBenefitInput,
  EligibilityCheckInput,
  CreateBenefitDefinitionInput,
} from './health-plans.types.js';

interface AuthenticatedRequest extends Request {
  user?: {
    hmoId?: string;
    accountId?: string;
    organizationId?: string;
    _id?: string;
    id?: string;

    hmo?: {
      _id?: string;
      id?: string;
      hmoId?: string;
    };

    account?: {
      _id?: string;
      id?: string;
      hmoId?: string;
      accountId?: string;
    };
  };

  account?: {
    accountId?: string;
    hmoId?: string;
    _id?: string;
    id?: string;
  };

  hmoId?: string;
}

/**
 * Safely unwrap request payloads.
 *
 * Supports both:
 *
 * {
 *   ...payload
 * }
 *
 * and:
 *
 * {
 *   data: {
 *     ...payload
 *   }
 * }
 *
 * The generic return type keeps the controller strongly typed
 * at the service boundary.
 */
const body = <T>(value: unknown): T => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {} as T;
  }

  const record = value as Record<string, unknown>;

  if (
    record.data &&
    typeof record.data === 'object' &&
    !Array.isArray(record.data)
  ) {
    return record.data as T;
  }

  return record as T;
};

/**
 * Resolve the authenticated HMO tenant.
 *
 * Never accepts hmoId from req.body or req.query.
 * Tenant identity must come from trusted authentication context.
 */
const hmoIdFromRequest = (req: Request): string => {
  const request = req as AuthenticatedRequest;

  const user = request.user;
  const account = request.account;

  const value =
    user?.hmoId ??
    user?.hmo?.hmoId ??
    user?.hmo?._id ??
    user?.hmo?.id ??
    user?.organizationId ??
    account?.hmoId ??
    request.hmoId ??
    user?.accountId ??
    account?.accountId ??
    account?._id ??
    account?.id ??
    user?.id ??
    user?._id;

  if (!value) {
    throw Object.assign(
      new Error('HMO context is required'),
      { statusCode: 403 }
    );
  }

  return String(value);
};

/**
 * Validate enum query parameters.
 */
const queryEnum = <T extends string>(
  value: unknown,
  values: readonly T[]
): T | undefined => {
  if (typeof value !== 'string' || !value) {
    return undefined;
  }

  if (!values.includes(value as T)) {
    throw Object.assign(
      new Error(`Invalid query value: ${value}`),
      { statusCode: 400 }
    );
  }

  return value as T;
};

export class HealthPlansController {
  /**
   * Create a health plan.
   */
  public async createPlan(
    req: Request,
    res: Response
  ): Promise<void> {
    const input = body<CreateHealthPlanInput>(req.body);

    const plan = await healthPlansService.createPlan(
      hmoIdFromRequest(req),
      input
    );

    res.status(201).json({
      success: true,
      data: plan,
      message: 'Health plan created successfully',
    });
  }

  /**
   * List health plans.
   */
  public async listPlans(
    req: Request,
    res: Response
  ): Promise<void> {
    const result = await healthPlansService.getPlans(
      hmoIdFromRequest(req),
      {
        page: req.query.page as string,
        limit: req.query.limit as string,
        search: req.query.search as string,
        tier: req.query.tier as string,
        effectiveDate: req.query.effectiveDate as string,

        status: queryEnum(
          req.query.status,
          Object.values(HealthPlanStatus)
        ),

        type: queryEnum(
          req.query.type,
          Object.values(HealthPlanType)
        ),
      }
    );

    res.json({
      success: true,
      data: result,
    });
  }

  /**
   * Get a single health plan.
   */
  public async getPlan(
    req: Request,
    res: Response
  ): Promise<void> {
    const plan = await healthPlansService.getPlanById(
      req.params.id,
      hmoIdFromRequest(req)
    );

    if (!plan) {
      res.status(404).json({
        success: false,
        message: 'Health plan not found',
      });
      return;
    }

    res.json({
      success: true,
      data: plan,
    });
  }

  /**
   * Update a health plan.
   */
  public async updatePlan(
    req: Request,
    res: Response
  ): Promise<void> {
    const plan = await healthPlansService.updatePlan(
      req.params.id,
      hmoIdFromRequest(req),
      body(req.body)
    );

    if (!plan) {
      res.status(404).json({
        success: false,
        message: 'Health plan not found',
      });
      return;
    }

    res.json({
      success: true,
      data: plan,
      message: 'Health plan updated successfully',
    });
  }

  /**
   * Change health plan status.
   */
  public async setPlanStatus(
    req: Request,
    res: Response
  ): Promise<void> {
    const requestBody = body<{
      status: HealthPlanStatus;
    }>(req.body);

    const status = queryEnum(
      requestBody.status,
      Object.values(HealthPlanStatus)
    );

    if (!status) {
      throw Object.assign(
        new Error('Health plan status is required'),
        { statusCode: 400 }
      );
    }

    const plan = await healthPlansService.setPlanStatus(
      req.params.id,
      hmoIdFromRequest(req),
      status
    );

    if (!plan) {
      res.status(404).json({
        success: false,
        message: 'Health plan not found',
      });
      return;
    }

    res.json({
      success: true,
      data: plan,
      message: 'Health plan status updated successfully',
    });
  }

  /**
   * Health plan statistics.
   */
  public async planStats(
    req: Request,
    res: Response
  ): Promise<void> {
    const stats = await healthPlansService.getPlanStats(
      hmoIdFromRequest(req)
    );

    res.json({
      success: true,
      data: stats,
    });
  }

  /**
   * Attach a benefit definition to a health plan.
   */
  public async attachBenefit(
    req: Request,
    res: Response
  ): Promise<void> {
    const input = body<AttachBenefitInput>(req.body);

    const association = await healthPlansService.attachBenefit(
      req.params.id,
      hmoIdFromRequest(req),
      input
    );

    res.status(201).json({
      success: true,
      data: association,
      message: 'Benefit attached to plan successfully',
    });
  }

  /**
   * List all benefits attached to a health plan.
   */
  public async listPlanBenefits(
    req: Request,
    res: Response
  ): Promise<void> {
    const benefits = await healthPlansService.getPlanBenefits(
      req.params.id,
      hmoIdFromRequest(req)
    );

    res.json({
      success: true,
      data: benefits,
    });
  }

  /**
   * Detach a benefit from a health plan.
   */
  public async detachBenefit(
    req: Request,
    res: Response
  ): Promise<void> {
    const deleted = await healthPlansService.detachBenefit(
      req.params.id,
      req.params.benefitId,
      hmoIdFromRequest(req)
    );

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Plan benefit association not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Benefit detached from plan successfully',
    });
  }

  /**
   * Check plan eligibility and calculate benefit availability.
   */
  public async checkEligibility(
    req: Request,
    res: Response
  ): Promise<void> {
    const input = body<EligibilityCheckInput>(req.body);

    const result = await healthPlansService.checkEligibility(
      hmoIdFromRequest(req),
      input
    );

    res.json({
      success: true,
      data: result,
    });
  }

  /**
   * Create a benefit definition.
   */
  public async createBenefit(
    req: Request,
    res: Response
  ): Promise<void> {
    const input =
      body<CreateBenefitDefinitionInput>(req.body);

    const benefit = await healthPlansService.createBenefit(
      hmoIdFromRequest(req),
      input
    );

    res.status(201).json({
      success: true,
      data: benefit,
      message: 'Benefit definition created successfully',
    });
  }

  /**
   * List benefit definitions.
   */
  public async listBenefits(
    req: Request,
    res: Response
  ): Promise<void> {
    const result = await healthPlansService.getBenefits(
      hmoIdFromRequest(req),
      {
        page: req.query.page as string,
        limit: req.query.limit as string,
        search: req.query.search as string,

        status: queryEnum(
          req.query.status,
          Object.values(BenefitStatus)
        ),

        category: queryEnum(
          req.query.category,
          Object.values(BenefitCategory)
        ),
      }
    );

    res.json({
      success: true,
      data: result,
    });
  }

  /**
   * Get a single benefit definition.
   */
  public async getBenefit(
    req: Request,
    res: Response
  ): Promise<void> {
    const benefit =
      await healthPlansService.getBenefitById(
        req.params.id,
        hmoIdFromRequest(req)
      );

    if (!benefit) {
      res.status(404).json({
        success: false,
        message: 'Benefit definition not found',
      });
      return;
    }

    res.json({
      success: true,
      data: benefit,
    });
  }

  /**
   * Update a benefit definition.
   */
  public async updateBenefit(
    req: Request,
    res: Response
  ): Promise<void> {
    const benefit =
      await healthPlansService.updateBenefit(
        req.params.id,
        hmoIdFromRequest(req),
        body(req.body)
      );

    if (!benefit) {
      res.status(404).json({
        success: false,
        message: 'Benefit definition not found',
      });
      return;
    }

    res.json({
      success: true,
      data: benefit,
      message: 'Benefit definition updated successfully',
    });
  }

  /**
   * Benefit statistics.
   */
  public async benefitStats(
    req: Request,
    res: Response
  ): Promise<void> {
    const stats =
      await healthPlansService.getBenefitStats(
        hmoIdFromRequest(req)
      );

    res.json({
      success: true,
      data: stats,
    });
  }
}

export const healthPlansController =
  new HealthPlansController();