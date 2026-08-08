import { Types } from 'mongoose';
import { ClaimModel } from './claims.model.js';
export class ClaimsService {
    async createClaim(hmoId, input) {
        const formattedItems = input.items.map((item) => {
            const claimedAmount = item.quantity * item.unitPrice;
            return {
                ...item,
                claimedAmount,
            };
        });
        const totalClaimedAmount = formattedItems.reduce((sum, item) => sum + item.claimedAmount, 0);
        const claimData = {
            ...input,
            hmoId: new Types.ObjectId(hmoId),
            memberId: new Types.ObjectId(input.memberId),
            providerId: new Types.ObjectId(input.providerId),
            items: formattedItems,
            totalClaimedAmount,
            status: 'SUBMITTED',
            submissionDate: new Date(),
        };
        return await ClaimModel.create(claimData);
    }
    async getClaims(hmoId, filters) {
        const page = Math.max(1, filters.page || 1);
        const limit = Math.max(1, Math.min(100, filters.limit || 20));
        const skip = (page - 1) * limit;
        const query = {
            hmoId: new Types.ObjectId(hmoId),
        };
        if (filters.status) {
            query.status = filters.status;
        }
        if (filters.memberId) {
            query.memberId = new Types.ObjectId(filters.memberId);
        }
        if (filters.providerId) {
            query.providerId = new Types.ObjectId(filters.providerId);
        }
        if (filters.startDate || filters.endDate) {
            query.treatmentDate = {};
            if (filters.startDate) {
                query.treatmentDate.$gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                query.treatmentDate.$lte = new Date(filters.endDate);
            }
        }
        if (filters.search) {
            const searchRegex = new RegExp(filters.search, 'i');
            query.$or = [
                { claimNumber: searchRegex },
                { diagnosis: searchRegex },
                { icdCode: searchRegex },
            ];
        }
        const [claims, total] = await Promise.all([
            ClaimModel.find(query)
                .populate('memberId', 'firstName lastName policyNumber email phone')
                .populate('providerId', 'name code state')
                .sort({ createdAt: -1 })
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
        return await ClaimModel.findOne({
            _id: new Types.ObjectId(id),
            hmoId: new Types.ObjectId(hmoId),
        })
            .populate('memberId')
            .populate('providerId')
            .populate('adjudicatedBy', 'firstName lastName email')
            .exec();
    }
    async updateClaimStatus(id, hmoId, userId, input) {
        const claim = await ClaimModel.findOne({
            _id: new Types.ObjectId(id),
            hmoId: new Types.ObjectId(hmoId),
        });
        if (!claim)
            return null;
        claim.status = input.status;
        claim.adjudicatedBy = new Types.ObjectId(userId);
        claim.adjudicatedAt = new Date();
        if (input.rejectionReason) {
            claim.rejectionReason = input.rejectionReason;
        }
        if (input.notes) {
            claim.notes = input.notes;
        }
        if (input.status === 'APPROVED' && input.approvedItems) {
            let totalApproved = 0;
            input.approvedItems.forEach(({ itemIndex, approvedAmount }) => {
                if (claim.items[itemIndex]) {
                    claim.items[itemIndex].approvedAmount = approvedAmount;
                    totalApproved += approvedAmount;
                }
            });
            claim.totalApprovedAmount = totalApproved;
        }
        else if (input.status === 'APPROVED' && !input.approvedItems) {
            claim.totalApprovedAmount = claim.totalClaimedAmount;
            claim.items.forEach((item) => {
                item.approvedAmount = item.claimedAmount;
            });
        }
        return await claim.save();
    }
    async getMemberClaims(memberId, hmoId) {
        return await ClaimModel.find({
            memberId: new Types.ObjectId(memberId),
            hmoId: new Types.ObjectId(hmoId),
        })
            .populate('providerId', 'name code')
            .sort({ createdAt: -1 })
            .exec();
    }
}
export const claimsService = new ClaimsService();
