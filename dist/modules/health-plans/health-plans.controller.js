import { healthPlansService } from './health-plans.service.js';
import { BenefitCategory, BenefitStatus, HealthPlanStatus, HealthPlanType, } from './health-plans.types.js';
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
const body = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
    }
    const record = value;
    if (record.data &&
        typeof record.data === 'object' &&
        !Array.isArray(record.data)) {
        return record.data;
    }
    return record;
};
/**
 * Resolve the authenticated HMO tenant.
 *
 * Never accepts hmoId from req.body or req.query.
 * Tenant identity must come from trusted authentication context.
 */
const hmoIdFromRequest = (req) => {
    const request = req;
    const user = request.user;
    const account = request.account;
    const value = user?.hmoId ??
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
        throw Object.assign(new Error('HMO context is required'), { statusCode: 403 });
    }
    return String(value);
};
/**
 * Validate enum query parameters.
 */
const queryEnum = (value, values) => {
    if (typeof value !== 'string' || !value) {
        return undefined;
    }
    if (!values.includes(value)) {
        throw Object.assign(new Error(`Invalid query value: ${value}`), { statusCode: 400 });
    }
    return value;
};
export class HealthPlansController {
    /**
     * Create a health plan.
     */
    async createPlan(req, res) {
        const input = body(req.body);
        const plan = await healthPlansService.createPlan(hmoIdFromRequest(req), input);
        res.status(201).json({
            success: true,
            data: plan,
            message: 'Health plan created successfully',
        });
    }
    /**
     * List health plans.
     */
    async listPlans(req, res) {
        const result = await healthPlansService.getPlans(hmoIdFromRequest(req), {
            page: req.query.page,
            limit: req.query.limit,
            search: req.query.search,
            tier: req.query.tier,
            effectiveDate: req.query.effectiveDate,
            status: queryEnum(req.query.status, Object.values(HealthPlanStatus)),
            type: queryEnum(req.query.type, Object.values(HealthPlanType)),
        });
        res.json({
            success: true,
            data: result,
        });
    }
    /**
     * Get a single health plan.
     */
    async getPlan(req, res) {
        const plan = await healthPlansService.getPlanById(req.params.id, hmoIdFromRequest(req));
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
    async updatePlan(req, res) {
        const plan = await healthPlansService.updatePlan(req.params.id, hmoIdFromRequest(req), body(req.body));
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
    async setPlanStatus(req, res) {
        const requestBody = body(req.body);
        const status = queryEnum(requestBody.status, Object.values(HealthPlanStatus));
        if (!status) {
            throw Object.assign(new Error('Health plan status is required'), { statusCode: 400 });
        }
        const plan = await healthPlansService.setPlanStatus(req.params.id, hmoIdFromRequest(req), status);
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
    async planStats(req, res) {
        const stats = await healthPlansService.getPlanStats(hmoIdFromRequest(req));
        res.json({
            success: true,
            data: stats,
        });
    }
    /**
     * Attach a benefit definition to a health plan.
     */
    async attachBenefit(req, res) {
        const input = body(req.body);
        const association = await healthPlansService.attachBenefit(req.params.id, hmoIdFromRequest(req), input);
        res.status(201).json({
            success: true,
            data: association,
            message: 'Benefit attached to plan successfully',
        });
    }
    /**
     * List all benefits attached to a health plan.
     */
    async listPlanBenefits(req, res) {
        const benefits = await healthPlansService.getPlanBenefits(req.params.id, hmoIdFromRequest(req));
        res.json({
            success: true,
            data: benefits,
        });
    }
    /**
     * Detach a benefit from a health plan.
     */
    async detachBenefit(req, res) {
        const deleted = await healthPlansService.detachBenefit(req.params.id, req.params.benefitId, hmoIdFromRequest(req));
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
    async checkEligibility(req, res) {
        const input = body(req.body);
        const result = await healthPlansService.checkEligibility(hmoIdFromRequest(req), input);
        res.json({
            success: true,
            data: result,
        });
    }
    /**
     * Create a benefit definition.
     */
    async createBenefit(req, res) {
        const input = body(req.body);
        const benefit = await healthPlansService.createBenefit(hmoIdFromRequest(req), input);
        res.status(201).json({
            success: true,
            data: benefit,
            message: 'Benefit definition created successfully',
        });
    }
    /**
     * List benefit definitions.
     */
    async listBenefits(req, res) {
        const result = await healthPlansService.getBenefits(hmoIdFromRequest(req), {
            page: req.query.page,
            limit: req.query.limit,
            search: req.query.search,
            status: queryEnum(req.query.status, Object.values(BenefitStatus)),
            category: queryEnum(req.query.category, Object.values(BenefitCategory)),
        });
        res.json({
            success: true,
            data: result,
        });
    }
    /**
     * Get a single benefit definition.
     */
    async getBenefit(req, res) {
        const benefit = await healthPlansService.getBenefitById(req.params.id, hmoIdFromRequest(req));
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
    async updateBenefit(req, res) {
        const benefit = await healthPlansService.updateBenefit(req.params.id, hmoIdFromRequest(req), body(req.body));
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
    async benefitStats(req, res) {
        const stats = await healthPlansService.getBenefitStats(hmoIdFromRequest(req));
        res.json({
            success: true,
            data: stats,
        });
    }
}
export const healthPlansController = new HealthPlansController();
