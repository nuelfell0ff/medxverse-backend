import { Types } from 'mongoose';
import { ClaimModel } from './claims.model.js';
const isObjectId = (value) => Types.ObjectId.isValid(value);
const toObjectId = (value, field) => {
    if (!isObjectId(value)) {
        throw new Error(`Invalid ${field}`);
    }
    return new Types.ObjectId(value);
};
const normalizeMoney = (value) => {
    if (!Number.isFinite(value) || value < 0) {
        throw new Error('Amount must be a finite number greater than or equal to 0');
    }
    return Math.round((value + Number.EPSILON) * 100) / 100;
};
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const allowedTransitions = {
    SUBMITTED: ['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED'],
    UNDER_REVIEW: ['APPROVED', 'REJECTED', 'CANCELLED'],
    APPROVED: ['PAID', 'CANCELLED'],
    REJECTED: [],
    PAID: [],
    CANCELLED: [],
};
const isClaimStatus = (value) => value === 'SUBMITTED' ||
    value === 'UNDER_REVIEW' ||
    value === 'APPROVED' ||
    value === 'REJECTED' ||
    value === 'PAID' ||
    value === 'CANCELLED';
export class ClaimsService {
    async createClaim(hmoId, input) {
        const hmoObjectId = toObjectId(hmoId, 'HMO ID');
        const memberObjectId = toObjectId(input.memberId, 'member ID');
        const providerObjectId = toObjectId(input.providerId, 'provider ID');
        if (!input.claimNumber?.trim()) {
            throw new Error('Claim number is required');
        }
        if (!input.diagnosis?.trim()) {
            throw new Error('Diagnosis is required');
        }
        const treatmentDate = new Date(input.treatmentDate);
        if (Number.isNaN(treatmentDate.getTime())) {
            throw new Error('Invalid treatment date');
        }
        if (!Array.isArray(input.items) || input.items.length === 0) {
            throw new Error('Claim must contain at least one item');
        }
        const formattedItems = input.items.map((item, index) => {
            if (!item.description?.trim()) {
                throw new Error(`Claim item ${index + 1}: description is required`);
            }
            if (!Number.isInteger(item.quantity) || item.quantity < 1) {
                throw new Error(`Claim item ${index + 1}: quantity must be a positive integer`);
            }
            const unitPrice = normalizeMoney(Number(item.unitPrice));
            return {
                code: item.code?.trim() || undefined,
                description: item.description.trim(),
                category: item.category,
                quantity: item.quantity,
                unitPrice,
                claimedAmount: normalizeMoney(item.quantity * unitPrice),
            };
        });
        const totalClaimedAmount = normalizeMoney(formattedItems.reduce((sum, item) => sum + item.claimedAmount, 0));
        // Duplicate detection is non-blocking:
        // the claim is accepted but flagged for adjudication.
        const duplicateCandidate = await ClaimModel.findOne({
            hmoId: hmoObjectId,
            memberId: memberObjectId,
            providerId: providerObjectId,
            treatmentDate: {
                $gte: new Date(treatmentDate.getFullYear(), treatmentDate.getMonth(), treatmentDate.getDate()),
                $lt: new Date(treatmentDate.getFullYear(), treatmentDate.getMonth(), treatmentDate.getDate() + 1),
            },
            totalClaimedAmount,
            status: { $ne: 'CANCELLED' },
        })
            .sort({ createdAt: -1 })
            .exec();
        try {
            const claim = await ClaimModel.create({
                hmoId: hmoObjectId,
                claimNumber: input.claimNumber.trim().toUpperCase(),
                memberId: memberObjectId,
                providerId: providerObjectId,
                preAuthorizationId: input.preAuthorizationId?.trim() || undefined,
                diagnosis: input.diagnosis.trim(),
                icdCode: input.icdCode?.trim().toUpperCase() || undefined,
                treatmentDate,
                submissionDate: new Date(),
                items: formattedItems,
                totalClaimedAmount,
                totalApprovedAmount: undefined,
                payableAmount: undefined,
                status: 'SUBMITTED',
                duplicateRisk: Boolean(duplicateCandidate),
                duplicateOf: duplicateCandidate?._id,
                notes: input.notes?.trim() || undefined,
                events: [
                    {
                        type: 'SUBMITTED',
                        toStatus: 'SUBMITTED',
                        createdAt: new Date(),
                    },
                ],
            });
            return claim;
        }
        catch (error) {
            if (typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                error.code === 11000) {
                throw new Error('A claim with this claim number already exists for this HMO');
            }
            throw error;
        }
    }
    async getClaims(hmoId, filters) {
        const hmoObjectId = toObjectId(hmoId, 'HMO ID');
        const page = Math.max(1, Number(filters.page) || 1);
        const limit = Math.max(1, Math.min(100, Number(filters.limit) || 20));
        const skip = (page - 1) * limit;
        const query = {
            hmoId: hmoObjectId,
        };
        if (filters.status) {
            query.status = filters.status;
        }
        if (filters.memberId) {
            query.memberId = toObjectId(filters.memberId, 'member ID');
        }
        if (filters.providerId) {
            query.providerId = toObjectId(filters.providerId, 'provider ID');
        }
        if (filters.startDate || filters.endDate) {
            const treatmentDate = {};
            if (filters.startDate) {
                const date = new Date(filters.startDate);
                if (Number.isNaN(date.getTime())) {
                    throw new Error('Invalid start date');
                }
                treatmentDate.$gte = date;
            }
            if (filters.endDate) {
                const date = new Date(filters.endDate);
                if (Number.isNaN(date.getTime())) {
                    throw new Error('Invalid end date');
                }
                if (/^\d{4}-\d{2}-\d{2}$/.test(String(filters.endDate))) {
                    date.setHours(23, 59, 59, 999);
                }
                treatmentDate.$lte = date;
            }
            query.treatmentDate = treatmentDate;
        }
        if (filters.search?.trim()) {
            const searchRegex = new RegExp(escapeRegex(filters.search.trim()), 'i');
            query.$or = [
                { claimNumber: searchRegex },
                { diagnosis: searchRegex },
                { icdCode: searchRegex },
                { preAuthorizationId: searchRegex },
            ];
        }
        const [claims, total] = await Promise.all([
            ClaimModel.find(query)
                .populate('memberId', 'firstName lastName policyNumber email phone')
                .populate('providerId', 'name code state')
                .populate('adjudicatedBy', 'firstName lastName email')
                .populate('duplicateOf', 'claimNumber status')
                .sort({
                createdAt: -1,
                _id: -1,
            })
                .skip(skip)
                .limit(limit)
                .exec(),
            ClaimModel.countDocuments(query),
        ]);
        return {
            claims,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getClaimById(id, hmoId) {
        return ClaimModel.findOne({
            _id: toObjectId(id, 'claim ID'),
            hmoId: toObjectId(hmoId, 'HMO ID'),
        })
            .populate('memberId')
            .populate('providerId')
            .populate('adjudicatedBy', 'firstName lastName email')
            .populate('duplicateOf', 'claimNumber status')
            .populate('events.actorId', 'firstName lastName email')
            .populate('appeals.submittedBy', 'firstName lastName email')
            .populate('appeals.resolvedBy', 'firstName lastName email')
            .populate('adjustments.adjustedBy', 'firstName lastName email')
            .exec();
    }
    async updateClaimStatus(id, hmoId, userId, input) {
        const claim = await ClaimModel.findOne({
            _id: toObjectId(id, 'claim ID'),
            hmoId: toObjectId(hmoId, 'HMO ID'),
        });
        if (!claim) {
            return null;
        }
        const currentStatus = isClaimStatus(claim.status)
            ? claim.status
            : (() => {
                throw new Error(`Invalid current claim status: ${String(claim.status)}`);
            })();
        const nextStatus = isClaimStatus(input.status)
            ? input.status
            : (() => {
                throw new Error(`Invalid claim status: ${String(input.status)}`);
            })();
        if (!allowedTransitions[currentStatus].includes(nextStatus)) {
            throw new Error(`Invalid claim status transition: ${currentStatus} -> ${nextStatus}`);
        }
        const adjudicatorId = toObjectId(userId, 'user ID');
        if (nextStatus === 'REJECTED' &&
            !input.rejectionReason?.trim()) {
            throw new Error('A rejection reason is required when rejecting a claim');
        }
        if (input.approvedItems) {
            if (nextStatus !== 'APPROVED') {
                throw new Error('Approved item amounts can only be supplied when approving a claim');
            }
            const seen = new Set();
            let totalApproved = 0;
            for (const approved of input.approvedItems) {
                if (!Number.isInteger(approved.itemIndex) ||
                    approved.itemIndex < 0 ||
                    approved.itemIndex >= claim.items.length) {
                    throw new Error(`Invalid approved item index: ${approved.itemIndex}`);
                }
                if (seen.has(approved.itemIndex)) {
                    throw new Error(`Duplicate approved item index: ${approved.itemIndex}`);
                }
                seen.add(approved.itemIndex);
                const amount = normalizeMoney(Number(approved.approvedAmount));
                const claimed = claim.items[approved.itemIndex].claimedAmount;
                if (amount > claimed) {
                    throw new Error(`Approved amount for item ${approved.itemIndex + 1} cannot exceed claimed amount`);
                }
                claim.items[approved.itemIndex].approvedAmount = amount;
                totalApproved += amount;
            }
            claim.totalApprovedAmount =
                normalizeMoney(totalApproved);
        }
        else if (nextStatus === 'APPROVED') {
            claim.totalApprovedAmount =
                claim.totalClaimedAmount;
            claim.items.forEach((item) => {
                item.approvedAmount =
                    item.claimedAmount;
            });
        }
        if (nextStatus === 'REJECTED') {
            claim.totalApprovedAmount = 0;
            claim.payableAmount = 0;
            claim.items.forEach((item) => {
                item.approvedAmount = 0;
            });
        }
        if (nextStatus === 'APPROVED') {
            claim.payableAmount = normalizeMoney(Math.max(0, Number(claim.totalApprovedAmount || 0) -
                Number(claim.adjustedAmount || 0)));
        }
        if (nextStatus === 'PAID' &&
            claim.status !== 'APPROVED') {
            throw new Error('Only an approved claim can be marked as paid');
        }
        const now = new Date();
        claim.status = nextStatus;
        claim.adjudicatedBy = adjudicatorId;
        claim.adjudicatedAt = now;
        if (input.rejectionReason?.trim()) {
            claim.rejectionReason =
                input.rejectionReason.trim();
        }
        if (input.notes !== undefined) {
            claim.notes =
                input.notes?.trim() || undefined;
        }
        claim.events.push({
            type: nextStatus,
            fromStatus: currentStatus,
            toStatus: nextStatus,
            actorId: adjudicatorId,
            reason: input.rejectionReason?.trim() ||
                undefined,
            notes: input.notes?.trim() ||
                undefined,
            createdAt: now,
        });
        return claim.save();
    }
    async submitAppeal(id, hmoId, userId, input) {
        const claim = await ClaimModel.findOne({
            _id: toObjectId(id, 'claim ID'),
            hmoId: toObjectId(hmoId, 'HMO ID'),
        });
        if (!claim) {
            return null;
        }
        if (claim.status !== 'REJECTED') {
            throw new Error('Only rejected claims can be appealed');
        }
        if (!input.reason?.trim()) {
            throw new Error('Appeal reason is required');
        }
        if (claim.appeals.some((appeal) => appeal.status === 'PENDING')) {
            throw new Error('This claim already has a pending appeal');
        }
        const actorId = toObjectId(userId, 'user ID');
        const now = new Date();
        claim.appeals.push({
            reason: input.reason.trim(),
            submittedBy: actorId,
            submittedAt: now,
            status: 'PENDING',
        });
        claim.events.push({
            type: 'APPEAL_SUBMITTED',
            actorId,
            reason: input.reason.trim(),
            createdAt: now,
        });
        return claim.save();
    }
    async resolveAppeal(id, hmoId, userId, input) {
        const claim = await ClaimModel.findOne({
            _id: toObjectId(id, 'claim ID'),
            hmoId: toObjectId(hmoId, 'HMO ID'),
        });
        if (!claim) {
            return null;
        }
        if (input.status !== 'UPHELD' &&
            input.status !== 'OVERTURNED') {
            throw new Error('Invalid appeal resolution');
        }
        if (!input.resolution?.trim()) {
            throw new Error('Appeal resolution is required');
        }
        const appeal = claim.appeals.find((item) => item.status === 'PENDING');
        if (!appeal) {
            throw new Error('No pending appeal found');
        }
        const actorId = toObjectId(userId, 'user ID');
        const now = new Date();
        appeal.status = input.status;
        appeal.resolution =
            input.resolution.trim();
        appeal.resolvedBy = actorId;
        appeal.resolvedAt = now;
        if (input.status === 'OVERTURNED') {
            claim.status = 'UNDER_REVIEW';
            claim.rejectionReason = undefined;
            claim.events.push({
                type: 'UNDER_REVIEW',
                fromStatus: 'REJECTED',
                toStatus: 'UNDER_REVIEW',
                actorId,
                reason: 'Appeal overturned',
                notes: input.resolution.trim(),
                createdAt: now,
            });
        }
        return claim.save();
    }
    async createAdjustment(id, hmoId, userId, input) {
        const claim = await ClaimModel.findOne({
            _id: toObjectId(id, 'claim ID'),
            hmoId: toObjectId(hmoId, 'HMO ID'),
        });
        if (!claim) {
            return null;
        }
        if (!['APPROVED', 'PAID'].includes(claim.status)) {
            throw new Error('Only approved or paid claims can be adjusted');
        }
        const amount = normalizeMoney(Number(input.amount));
        if (!input.reason?.trim()) {
            throw new Error('Adjustment reason is required');
        }
        const actorId = toObjectId(userId, 'user ID');
        const currentAdjusted = Number(claim.adjustedAmount || 0);
        const approved = Number(claim.totalApprovedAmount || 0);
        if (currentAdjusted + amount >
            approved) {
            throw new Error('Total adjustments cannot exceed the approved amount');
        }
        const now = new Date();
        claim.adjustments.push({
            amount,
            reason: input.reason.trim(),
            adjustedBy: actorId,
            adjustedAt: now,
        });
        claim.adjustedAmount =
            normalizeMoney(currentAdjusted + amount);
        claim.payableAmount =
            normalizeMoney(Math.max(0, approved -
                claim.adjustedAmount));
        claim.events.push({
            type: 'ADJUSTED',
            actorId,
            reason: input.reason.trim(),
            createdAt: now,
        });
        return claim.save();
    }
    async getMemberClaims(memberId, hmoId) {
        return ClaimModel.find({
            memberId: toObjectId(memberId, 'member ID'),
            hmoId: toObjectId(hmoId, 'HMO ID'),
        })
            .populate('providerId', 'name code')
            .sort({
            createdAt: -1,
            _id: -1,
        })
            .exec();
    }
}
export const claimsService = new ClaimsService();
