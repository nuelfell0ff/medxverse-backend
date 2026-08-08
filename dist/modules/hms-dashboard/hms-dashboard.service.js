import mongoose, { Types } from 'mongoose';
import { HmsDashboardSettingsModel } from './hms-dashboard.model.js';
export class HmsDashboardService {
    async getDashboardMetrics(hmoId) {
        const objectHmoId = new Types.ObjectId(hmoId);
        const MemberModel = mongoose.models.HMSMember || mongoose.model('HMSMember');
        const BenefitPlanModel = mongoose.models.BenefitPlan || mongoose.model('BenefitPlan');
        const ClaimModel = mongoose.models.Claim || mongoose.model('Claim');
        const [enrolledMembersCount, activePlansCount, claimsStats, financialAgg,] = await Promise.all([
            MemberModel.countDocuments({ hmoId: objectHmoId, status: 'ACTIVE' }).catch(() => 0),
            BenefitPlanModel.countDocuments({ hmoId: objectHmoId, isActive: true }).catch(() => 0),
            ClaimModel.aggregate([
                { $match: { hmoId: objectHmoId } },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$claimAmount' },
                        approvedAmount: { $sum: '$approvedAmount' },
                    },
                },
            ]).catch(() => []),
            ClaimModel.aggregate([
                { $match: { hmoId: objectHmoId } },
                {
                    $group: {
                        _id: null,
                        claimsValueOnFile: { $sum: '$claimAmount' },
                        settledToProviders: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'SETTLED'] }, '$approvedAmount', 0],
                            },
                        },
                        approvedAwaitingPayment: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'APPROVED'] }, '$approvedAmount', 0],
                            },
                        },
                        exposureUnderReview: {
                            $sum: {
                                $cond: [{ $in: ['$status', ['SUBMITTED', 'UNDER_REVIEW']] }, '$claimAmount', 0],
                            },
                        },
                        deniedValue: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'DENIED'] }, '$claimAmount', 0],
                            },
                        },
                        totalVolume: { $sum: 1 },
                        deniedVolume: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'DENIED'] }, 1, 0],
                            },
                        },
                        draftCount: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'DRAFT'] }, 1, 0],
                            },
                        },
                    },
                },
            ]).catch(() => []),
        ]);
        const claimsMap = new Map();
        claimsStats.forEach((item) => {
            claimsMap.set(item._id, item);
        });
        const submitted = claimsMap.get('SUBMITTED')?.count || 0;
        const underReview = claimsMap.get('UNDER_REVIEW')?.count || 0;
        const approved = claimsMap.get('APPROVED')?.count || 0;
        const denied = claimsMap.get('DENIED')?.count || 0;
        const settled = claimsMap.get('SETTLED')?.count || 0;
        const pendingReviewCount = submitted + underReview;
        const fin = financialAgg[0] || {
            claimsValueOnFile: 0,
            settledToProviders: 0,
            approvedAwaitingPayment: 0,
            exposureUnderReview: 0,
            deniedValue: 0,
            totalVolume: 0,
            deniedVolume: 0,
            draftCount: 0,
        };
        const deniedPercentage = fin.totalVolume > 0
            ? Math.round((fin.deniedVolume / fin.totalVolume) * 100)
            : 0;
        return {
            overview: {
                enrolledMembers: {
                    totalEnrolled: enrolledMembersCount,
                    activePlansCount,
                },
                pendingReview: {
                    count: pendingReviewCount,
                    draftCount: fin.draftCount,
                },
                approvedClaims: {
                    count: approved + settled,
                    settledAmount: fin.settledToProviders,
                },
                deniedClaims: {
                    count: denied,
                    volumePercentage: deniedPercentage,
                },
            },
            pipeline: {
                submitted,
                underReview,
                approved,
                denied,
                settled,
            },
            financialSummary: {
                claimsValueOnFile: fin.claimsValueOnFile,
                settledToProviders: fin.settledToProviders,
                approvedAwaitingPayment: fin.approvedAwaitingPayment,
                exposureUnderReview: fin.exposureUnderReview,
                deniedValue: fin.deniedValue,
            },
        };
    }
    async getDashboardSettings(hmoId) {
        let settings = await HmsDashboardSettingsModel.findOne({ hmoId });
        if (!settings) {
            settings = await HmsDashboardSettingsModel.create({
                hmoId: new Types.ObjectId(hmoId),
            });
        }
        return settings;
    }
    async updateDashboardSettings(hmoId, input) {
        const settings = await HmsDashboardSettingsModel.findOneAndUpdate({ hmoId }, { $set: input }, { new: true, upsert: true });
        return settings;
    }
}
export const hmsDashboardService = new HmsDashboardService();
