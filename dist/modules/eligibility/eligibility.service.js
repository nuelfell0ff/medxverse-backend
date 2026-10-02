import mongoose, { Types } from 'mongoose';
import { EnrolleeModel } from '../enrollees/enrollees.model.js';
import { ClaimModel } from '../claims/claims.model.js';
import { HMOProviderModel } from '../provider/provider.model.js';
import { EligibilityCheckModel } from './eligibility.model.js';
const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const objectId = (value, field) => {
    if (!value || !Types.ObjectId.isValid(value))
        throw fail(`Invalid ${field}`);
    return new Types.ObjectId(value);
};
const parseDate = (value, field) => {
    const date = value instanceof Date ? new Date(value.getTime()) : value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime()))
        throw fail(`Invalid ${field}`);
    return date;
};
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/**
 * The HMO architecture is:
 *
 * Enrollee -> healthPlanId -> HealthPlan
 * HealthPlan -> PlanBenefit -> BenefitDefinition
 *
 * A benefit is therefore NOT stored directly on the enrollee.  Eligibility
 * must resolve the enrollee's health plan and then resolve the benefits that
 * are attached to that plan.
 *
 * These helpers intentionally use the already-registered Mongoose models so
 * this module does not duplicate or redefine the health-plan schemas.
 */
const requiredModel = (names, label) => {
    for (const name of names) {
        const model = mongoose.models[name];
        if (model)
            return model;
    }
    throw fail(`${label} model is not registered. Ensure the HMO health-plans module is loaded before eligibility.`, 500);
};
const claimCategoryToBenefit = (category) => {
    switch (category) {
        case 'DRUG': return 'PHARMACY';
        case 'ACCOMMODATION': return 'INPATIENT';
        case 'CONSULTATION': return 'OUTPATIENT';
        case 'LAB_TEST': return 'OUTPATIENT';
        case 'PROCEDURE': return 'SURGICAL';
        default: return 'OUTPATIENT';
    }
};
const benefitCategoryMatches = (benefit, requested) => {
    if (benefit.category === requested)
        return true;
    // Keep the verification endpoint compatible with claims/service categories
    // where a benefit definition may use the more general clinical grouping.
    if (requested === 'PHARMACY')
        return benefit.category === 'PHARMACY';
    if (requested === 'SURGICAL')
        return benefit.category === 'SURGICAL';
    return false;
};
const toNumber = (value) => {
    if (value === undefined || value === null || value === '')
        return undefined;
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
};
export class EligibilityService {
    async verify(hmoId, input) {
        const tenantId = objectId(hmoId, 'HMO ID');
        const enrolleeId = objectId(input.memberId, 'member ID');
        const serviceDate = parseDate(input.serviceDate, 'service date');
        if (input.requestedAmount !== undefined && (!Number.isFinite(input.requestedAmount) || input.requestedAmount < 0)) {
            throw fail('Requested amount must be a non-negative number');
        }
        /* -------------------------------------------------------------
           1. Resolve the enrollee.
              IMPORTANT: do NOT populate benefitPlanId. The enrollee now stores
              healthPlanId, which is the authoritative coverage relationship.
        ------------------------------------------------------------- */
        const enrollee = await EnrolleeModel.findOne({ _id: enrolleeId, hmoId: tenantId }).exec();
        if (!enrollee)
            throw fail('Enrollee not found for this HMO', 404);
        const healthPlanId = enrollee.get('healthPlanId');
        if (!healthPlanId || !Types.ObjectId.isValid(String(healthPlanId))) {
            throw fail('The enrollee does not have a valid health plan', 422);
        }
        const HealthPlanModel = requiredModel(['HealthPlan'], 'Health plan');
        const PlanBenefitModel = requiredModel(['PlanBenefit'], 'Plan benefit');
        const BenefitDefinitionModel = requiredModel(['BenefitDefinition'], 'Benefit definition');
        /* -------------------------------------------------------------
           2. Resolve the health plan belonging to this HMO.
        ------------------------------------------------------------- */
        const plan = await HealthPlanModel.findOne({
            _id: healthPlanId,
            hmoId: tenantId,
        }).exec();
        if (!plan)
            throw fail('The enrollee health plan was not found for this HMO', 404);
        const reasons = [];
        const now = serviceDate.getTime();
        const startValue = enrollee.get('startDate');
        const endValue = enrollee.get('endDate');
        const start = startValue ? new Date(startValue).getTime() : NaN;
        const end = endValue ? new Date(endValue).getTime() : undefined;
        const memberActive = enrollee.get('status') === 'ACTIVE';
        const withinCoverage = Number.isFinite(start) && now >= start && (end === undefined || now <= end);
        const planActive = plan.status === 'ACTIVE';
        const planEffectiveFrom = plan.effectiveFrom ? new Date(plan.effectiveFrom).getTime() : undefined;
        const planEffectiveTo = plan.effectiveTo ? new Date(plan.effectiveTo).getTime() : undefined;
        const planEffective = (planEffectiveFrom === undefined || now >= planEffectiveFrom) &&
            (planEffectiveTo === undefined || now <= planEffectiveTo);
        if (!memberActive)
            reasons.push(`Membership status is ${enrollee.get('status')}.`);
        if (!withinCoverage)
            reasons.push('The requested service date is outside the member coverage period.');
        if (!planActive)
            reasons.push(`Health plan status is ${plan.status}.`);
        if (!planEffective)
            reasons.push('The health plan is not effective on the requested service date.');
        /* -------------------------------------------------------------
           3. Resolve the benefit THROUGH the health plan.
              PlanBenefit contains the plan-specific rule; BenefitDefinition
              contains the reusable benefit identity/category.
        ------------------------------------------------------------- */
        const associations = await PlanBenefitModel.find({
            hmoId: tenantId,
            healthPlanId: plan._id,
        }).exec();
        let selectedAssociation = null;
        let benefit = null;
        const requestedServiceCode = input.serviceCode?.trim().toUpperCase();
        for (const association of associations) {
            const candidate = (await BenefitDefinitionModel.findOne({
                _id: association.benefitId,
                hmoId: tenantId,
            }).lean().exec());
            if (!candidate)
                continue;
            const candidateCode = candidate.code
                ? String(candidate.code).trim().toUpperCase()
                : undefined;
            // The frontend explicitly selects a benefit from the enrollee's
            // health-plan benefits. When a serviceCode is supplied, it is the
            // authoritative benefit selection and MUST be matched to the
            // PlanBenefit association. Do not silently substitute another benefit
            // merely because it has the same category.
            if (requestedServiceCode) {
                if (candidateCode === requestedServiceCode) {
                    selectedAssociation = association.toObject
                        ? association.toObject()
                        : association;
                    benefit = candidate;
                    break;
                }
                continue;
            }
            // Backward compatibility for older clients that did not send a
            // serviceCode: fall back to category matching.
            if (benefitCategoryMatches(candidate, input.serviceCategory)) {
                selectedAssociation = association.toObject
                    ? association.toObject()
                    : association;
                benefit = candidate;
                break;
            }
        }
        if (!selectedAssociation || !benefit) {
            reasons.push(requestedServiceCode
                ? `The selected benefit (${requestedServiceCode}) is not attached to the enrollee's health plan.`
                : 'No benefit under the enrollee health plan covers the requested service category.');
        }
        // Service identity is always resolved from the selected benefit under
        // the enrollee's health plan. The caller never gets to invent a service
        // code independently of the plan.
        const resolvedServiceCode = benefit?.code ? String(benefit.code).trim().toUpperCase() : undefined;
        const resolvedServiceDescription = benefit?.name ||
            benefit?.description ||
            input.serviceDescription?.trim() ||
            undefined;
        const rule = selectedAssociation?.rule || {};
        const amount = Number(input.requestedAmount || 0);
        /* -------------------------------------------------------------
           4. Provider/network verification.
        ------------------------------------------------------------- */
        let providerResult;
        if (input.providerId) {
            const provider = await HMOProviderModel.findOne({
                _id: objectId(input.providerId, 'provider ID'),
                hmoId: tenantId,
            }).lean().exec();
            if (!provider) {
                reasons.push('Provider is not registered with this HMO.');
            }
            else {
                const networkIds = Array.isArray(provider.networkIds) ? provider.networkIds.map(String) : [];
                const networkMatched = input.networkId ? networkIds.includes(input.networkId) : true;
                providerResult = {
                    id: String(provider._id),
                    code: provider.code,
                    name: provider.name,
                    status: provider.status,
                    accreditationStatus: provider.accreditation?.status,
                    networkMatched,
                };
                if (provider.status !== 'ACTIVE')
                    reasons.push(`Provider status is ${provider.status}.`);
                if (provider.accreditation?.status !== 'VERIFIED')
                    reasons.push('Provider accreditation is not verified.');
                if (input.networkId && !networkMatched)
                    reasons.push('Provider is not participating in the requested network.');
            }
        }
        /* -------------------------------------------------------------
           5. Claims utilisation.
        ------------------------------------------------------------- */
        const yearStart = new Date(serviceDate.getFullYear(), 0, 1);
        const yearEnd = new Date(serviceDate.getFullYear() + 1, 0, 1);
        const claims = await ClaimModel.find({
            hmoId: tenantId,
            memberId: enrolleeId,
            treatmentDate: { $gte: yearStart, $lt: yearEnd },
            status: { $in: ['APPROVED', 'PAID'] },
        }).select('totalApprovedAmount items').lean().exec();
        const annualUsed = claims.reduce((sum, claim) => sum + Number(claim.totalApprovedAmount || 0), 0);
        const annualPlanLimit = toNumber(plan.annualUtilizationLimit);
        const annualRemaining = annualPlanLimit !== undefined
            ? Math.max(0, annualPlanLimit - annualUsed)
            : undefined;
        const categoryUsed = claims.reduce((sum, claim) => {
            return sum + (Array.isArray(claim.items) ? claim.items.reduce((itemSum, item) => {
                return itemSum + (claimCategoryToBenefit(String(item.category || '')) === input.serviceCategory
                    ? Number(item.approvedAmount ?? 0)
                    : 0);
            }, 0) : 0);
        }, 0);
        const annualLimit = toNumber(rule.annualLimitAmount);
        const perVisitLimit = toNumber(rule.perVisitLimitAmount);
        const copayPercentage = toNumber(rule.copayPercentage) ?? 0;
        const copayAmount = toNumber(rule.copayAmount) ?? 0;
        const requiresPreAuth = Boolean(rule.requiresPreAuth);
        const covered = Boolean(rule.covered);
        const benefitEvaluation = {
            category: (benefit?.category || input.serviceCategory),
            covered,
            annualLimit,
            annualUsed: categoryUsed,
            annualRemaining: annualLimit !== undefined ? Math.max(0, annualLimit - categoryUsed) : undefined,
            perVisitLimit,
            copayPercentage,
            copayAmount,
            requiresPreAuth,
            notes: rule.notes,
        };
        if (selectedAssociation && !covered)
            reasons.push('The requested benefit is excluded from this health plan.');
        if (benefit?.status && benefit.status !== 'ACTIVE')
            reasons.push(`Benefit status is ${benefit.status}.`);
        if (annualLimit !== undefined && categoryUsed >= annualLimit)
            reasons.push('The annual benefit amount limit has been reached.');
        if (annualLimit !== undefined && amount > Math.max(0, annualLimit - categoryUsed))
            reasons.push('Requested amount exceeds the remaining annual benefit amount.');
        if (perVisitLimit !== undefined && amount > perVisitLimit)
            reasons.push('Requested amount exceeds the per-visit benefit limit.');
        if (annualRemaining !== undefined && amount > annualRemaining)
            reasons.push('Requested amount exceeds the remaining annual plan limit.');
        const waitingPeriodDays = Number(rule.waitingPeriodDays ?? plan.defaultWaitingPeriodDays ?? 0);
        if (waitingPeriodDays > 0 && Number.isFinite(start)) {
            const waitingEnd = new Date(start + waitingPeriodDays * 86400000);
            if (serviceDate < waitingEnd)
                reasons.push(`The benefit waiting period ends on ${waitingEnd.toISOString()}.`);
        }
        const eligibleCore = memberActive &&
            withinCoverage &&
            planActive &&
            planEffective &&
            Boolean(selectedAssociation) &&
            covered &&
            (!benefit?.status || benefit.status === 'ACTIVE') &&
            reasons.length === 0;
        const partial = eligibleCore && requiresPreAuth;
        const decision = !eligibleCore ? 'INELIGIBLE' : partial ? 'PARTIAL' : 'ELIGIBLE';
        if (partial)
            reasons.push('Benefit is covered, but pre-authorization is required before service delivery.');
        const result = {
            eligible: decision === 'ELIGIBLE',
            decision,
            reason: reasons[0],
            reasons,
            checkedAt: new Date(),
            serviceDate,
            member: {
                id: String(enrollee._id),
                policyNumber: enrollee.get('policyNumber'),
                name: `${enrollee.get('firstName')} ${enrollee.get('lastName')}`.trim(),
                status: enrollee.get('status'),
                coverageStartDate: startValue ? new Date(startValue) : new Date(0),
                coverageEndDate: endValue ? new Date(endValue) : undefined,
            },
            plan: {
                id: String(plan._id),
                code: plan.code,
                name: plan.name,
                tier: plan.tier,
                status: plan.status,
                annualMaxBenefit: annualPlanLimit,
                annualUsed,
                annualRemaining,
            },
            provider: providerResult,
            benefit: benefitEvaluation,
        };
        await EligibilityCheckModel.create({
            hmoId: tenantId,
            memberId: enrolleeId,
            providerId: input.providerId ? objectId(input.providerId, 'provider ID') : undefined,
            serviceCategory: input.serviceCategory,
            // Always persist the service code resolved from the plan benefit.
            serviceCode: resolvedServiceCode,
            serviceDescription: resolvedServiceDescription,
            serviceDate,
            requestedAmount: input.requestedAmount,
            networkId: input.networkId?.trim() || undefined,
            decision,
            eligible: result.eligible,
            reasons,
            result,
        });
        return result;
    }
    async getChecks(hmoId, filters) {
        const tenantId = objectId(hmoId, 'HMO ID');
        const page = Math.max(1, Number(filters.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
        const query = { hmoId: tenantId };
        if (filters.decision)
            query.decision = filters.decision;
        if (filters.serviceCategory)
            query.serviceCategory = filters.serviceCategory;
        if (filters.memberId)
            query.memberId = objectId(filters.memberId, 'member ID');
        if (filters.providerId)
            query.providerId = objectId(filters.providerId, 'provider ID');
        if (filters.search?.trim()) {
            const regex = new RegExp(escapeRegex(filters.search.trim()), 'i');
            query.$or = [{ serviceCode: regex }, { serviceDescription: regex }];
        }
        const skip = (page - 1) * limit;
        const [checks, total] = await Promise.all([
            EligibilityCheckModel.find(query)
                .populate('memberId', 'firstName lastName policyNumber')
                .populate('providerId', 'name code')
                .sort({ createdAt: -1, _id: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            EligibilityCheckModel.countDocuments(query),
        ]);
        return { checks, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async getCheckById(id, hmoId) {
        return EligibilityCheckModel.findOne({
            _id: objectId(id, 'eligibility check ID'),
            hmoId: objectId(hmoId, 'HMO ID'),
        })
            .populate('memberId')
            .populate('providerId')
            .exec();
    }
    async getMemberChecks(memberId, hmoId) {
        return EligibilityCheckModel.find({
            hmoId: objectId(hmoId, 'HMO ID'),
            memberId: objectId(memberId, 'member ID'),
        })
            .sort({ createdAt: -1 })
            .limit(50)
            .exec();
    }
    async getStats(hmoId) {
        const tenantId = objectId(hmoId, 'HMO ID');
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const [totalChecks, eligible, ineligible, partial, today] = await Promise.all([
            EligibilityCheckModel.countDocuments({ hmoId: tenantId }),
            EligibilityCheckModel.countDocuments({ hmoId: tenantId, decision: 'ELIGIBLE' }),
            EligibilityCheckModel.countDocuments({ hmoId: tenantId, decision: 'INELIGIBLE' }),
            EligibilityCheckModel.countDocuments({ hmoId: tenantId, decision: 'PARTIAL' }),
            EligibilityCheckModel.countDocuments({ hmoId: tenantId, createdAt: { $gte: start } }),
        ]);
        return { totalChecks, eligible, ineligible, partial, today };
    }
}
export const eligibilityService = new EligibilityService();
