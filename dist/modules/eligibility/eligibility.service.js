import { Types } from 'mongoose';
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
export class EligibilityService {
    async verify(hmoId, input) {
        const tenantId = objectId(hmoId, 'HMO ID');
        const memberId = objectId(input.memberId, 'member ID');
        const serviceDate = parseDate(input.serviceDate, 'service date');
        if (input.requestedAmount !== undefined && (!Number.isFinite(input.requestedAmount) || input.requestedAmount < 0)) {
            throw fail('Requested amount must be a non-negative number');
        }
        const enrollee = await EnrolleeModel.findOne({ _id: memberId, hmoId: tenantId })
            .populate('benefitPlanId')
            .exec();
        if (!enrollee)
            throw fail('Enrollee not found for this HMO', 404);
        const plan = enrollee.get('benefitPlanId');
        if (!plan?._id)
            throw fail('The enrollee does not have a valid benefit plan', 422);
        const reasons = [];
        const now = serviceDate.getTime();
        const start = new Date(enrollee.get('startDate')).getTime();
        const endValue = enrollee.get('endDate');
        const end = endValue ? new Date(endValue).getTime() : undefined;
        const memberActive = enrollee.get('status') === 'ACTIVE';
        const withinCoverage = now >= start && (end === undefined || now <= end);
        const planActive = plan.status === 'ACTIVE';
        if (!memberActive)
            reasons.push(`Membership status is ${enrollee.get('status')}.`);
        if (!withinCoverage)
            reasons.push('The requested service date is outside the member coverage period.');
        if (!planActive)
            reasons.push(`Benefit plan status is ${plan.status}.`);
        let providerResult;
        if (input.providerId) {
            const provider = await HMOProviderModel.findOne({ _id: objectId(input.providerId, 'provider ID'), hmoId: tenantId }).lean().exec();
            if (!provider)
                reasons.push('Provider is not registered with this HMO.');
            else {
                const networkMatched = input.networkId ? provider.networkIds.includes(input.networkId) : true;
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
        const yearStart = new Date(serviceDate.getFullYear(), 0, 1);
        const yearEnd = new Date(serviceDate.getFullYear() + 1, 0, 1);
        const claims = await ClaimModel.find({
            hmoId: tenantId,
            memberId,
            treatmentDate: { $gte: yearStart, $lt: yearEnd },
            status: { $in: ['APPROVED', 'PAID'] },
        }).select('totalApprovedAmount items').lean().exec();
        const annualUsed = claims.reduce((sum, claim) => sum + Number(claim.totalApprovedAmount || 0), 0);
        const annualRemaining = typeof plan.annualMaxBenefit === 'number'
            ? Math.max(0, plan.annualMaxBenefit - annualUsed)
            : undefined;
        const rule = (plan.rules || []).find((item) => item.category === input.serviceCategory);
        const categoryUsed = claims.reduce((sum, claim) => {
            return sum + (claim.items || []).reduce((itemSum, item) => {
                return itemSum + (claimCategoryToBenefit(item.category) === input.serviceCategory ? Number(item.approvedAmount ?? 0) : 0);
            }, 0);
        }, 0);
        const benefit = {
            category: input.serviceCategory,
            covered: Boolean(rule?.isCovered),
            annualLimit: typeof rule?.annualLimit === 'number' ? rule.annualLimit : undefined,
            annualUsed: categoryUsed,
            annualRemaining: typeof rule?.annualLimit === 'number' ? Math.max(0, rule.annualLimit - categoryUsed) : undefined,
            perVisitLimit: typeof rule?.perVisitLimit === 'number' ? rule.perVisitLimit : undefined,
            copayPercentage: Number(rule?.copayPercentage || 0),
            copayAmount: Number(rule?.copayAmount || 0),
            requiresPreAuth: Boolean(rule?.requiresPreAuth),
            notes: rule?.notes,
        };
        if (!rule)
            reasons.push('No benefit rule is configured for the requested service category.');
        else if (!rule.isCovered)
            reasons.push('The requested service category is not covered by the member plan.');
        const amount = Number(input.requestedAmount || 0);
        if (benefit.annualRemaining !== undefined && amount > benefit.annualRemaining)
            reasons.push('Requested amount exceeds the remaining annual category benefit.');
        if (annualRemaining !== undefined && amount > annualRemaining)
            reasons.push('Requested amount exceeds the remaining annual maximum benefit.');
        const eligibleCore = memberActive && withinCoverage && planActive && reasons.length === 0;
        const partial = eligibleCore && benefit.requiresPreAuth;
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
                name: `${enrollee.get('firstName')} ${enrollee.get('lastName')}`,
                status: enrollee.get('status'),
                coverageStartDate: new Date(enrollee.get('startDate')),
                coverageEndDate: endValue ? new Date(endValue) : undefined,
            },
            plan: {
                id: String(plan._id), code: plan.code, name: plan.name, tier: plan.tier,
                status: plan.status, annualMaxBenefit: plan.annualMaxBenefit, annualUsed, annualRemaining,
            },
            provider: providerResult,
            benefit,
        };
        await EligibilityCheckModel.create({
            hmoId: tenantId,
            memberId,
            providerId: input.providerId ? objectId(input.providerId, 'provider ID') : undefined,
            serviceCategory: input.serviceCategory,
            serviceCode: input.serviceCode?.trim().toUpperCase() || undefined,
            serviceDescription: input.serviceDescription?.trim() || undefined,
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
        if (filters.search?.trim())
            query.$or = [{ serviceCode: new RegExp(escapeRegex(filters.search.trim()), 'i') }, { serviceDescription: new RegExp(escapeRegex(filters.search.trim()), 'i') }];
        const skip = (page - 1) * limit;
        const [checks, total] = await Promise.all([
            EligibilityCheckModel.find(query).populate('memberId', 'firstName lastName policyNumber').populate('providerId', 'name code').sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).exec(),
            EligibilityCheckModel.countDocuments(query),
        ]);
        return { checks, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async getCheckById(id, hmoId) {
        return EligibilityCheckModel.findOne({ _id: objectId(id, 'eligibility check ID'), hmoId: objectId(hmoId, 'HMO ID') }).populate('memberId').populate('providerId').exec();
    }
    async getMemberChecks(memberId, hmoId) {
        return EligibilityCheckModel.find({ hmoId: objectId(hmoId, 'HMO ID'), memberId: objectId(memberId, 'member ID') }).sort({ createdAt: -1 }).limit(50).exec();
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
