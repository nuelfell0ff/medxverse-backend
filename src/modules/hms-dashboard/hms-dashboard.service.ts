import { Types } from 'mongoose';
import { MemberModel } from '../members/members.model.js';
import { BenefitPackageModel } from '../benefits/benefits.model.js';
import { ClaimModel } from '../claims/claims.model.js';
import { HmsDashboardSettingsModel } from './hms-dashboard.model.js';
import {
  IHmsDashboardMetrics,
  IHmsDashboardSettingsDocument,
  UpdateDashboardSettingsInput,
} from './hms-dashboard.types.js';

export class HmsDashboardService {
  public async getDashboardMetrics(hmoId: string): Promise<IHmsDashboardMetrics> {
    const objectHmoId = new Types.ObjectId(hmoId);

    const [enrolledMembersCount, activePlansCount, claimsStats, financialAgg] =
      await Promise.all([
        MemberModel.countDocuments({ hmoId: objectHmoId, status: 'ACTIVE' }),
        BenefitPackageModel.countDocuments({ hmoId: objectHmoId, status: { $in: ['ACTIVE', 'PUBLISHED'] } }),
        ClaimModel.aggregate([
          { $match: { hmoId: objectHmoId } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              totalAmount: { $sum: '$totalClaimedAmount' },
              approvedAmount: { $sum: { $ifNull: ['$totalApprovedAmount', 0] } },
            },
          },
        ]),
        ClaimModel.aggregate([
          { $match: { hmoId: objectHmoId } },
          {
            $group: {
              _id: null,
              claimsValueOnFile: { $sum: '$totalClaimedAmount' },
              settledToProviders: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'PAID'] }, { $ifNull: ['$totalApprovedAmount', 0] }, 0],
                },
              },
              approvedAwaitingPayment: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'APPROVED'] }, { $ifNull: ['$totalApprovedAmount', 0] }, 0],
                },
              },
              exposureUnderReview: {
                $sum: {
                  $cond: [{ $in: ['$status', ['SUBMITTED', 'UNDER_REVIEW']] }, '$totalClaimedAmount', 0],
                },
              },
              deniedValue: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'REJECTED'] }, '$totalClaimedAmount', 0],
                },
              },
              totalVolume: { $sum: 1 },
              deniedVolume: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'REJECTED'] }, 1, 0],
                },
              },
              draftCount: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0],
                },
              },
            },
          },
        ]),
      ]);

    const claimsMap = new Map<string, { count: number; totalAmount: number; approvedAmount: number }>();
    claimsStats.forEach((item: { _id: string; count: number; totalAmount: number; approvedAmount: number }) => {
      claimsMap.set(item._id, item);
    });

    const submitted = claimsMap.get('SUBMITTED')?.count || 0;
    const underReview = claimsMap.get('UNDER_REVIEW')?.count || 0;
    const approved = claimsMap.get('APPROVED')?.count || 0;
    const denied = claimsMap.get('REJECTED')?.count || 0;
    const settled = claimsMap.get('PAID')?.count || 0;
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

  public async getDashboardSettings(hmoId: string): Promise<IHmsDashboardSettingsDocument> {
    let settings = await HmsDashboardSettingsModel.findOne({ hmoId });
    if (!settings) {
      settings = await HmsDashboardSettingsModel.create({
        hmoId: new Types.ObjectId(hmoId),
      });
    }
    return settings;
  }

  public async updateDashboardSettings(
    hmoId: string,
    input: UpdateDashboardSettingsInput
  ): Promise<IHmsDashboardSettingsDocument> {
    const settings = await HmsDashboardSettingsModel.findOneAndUpdate(
      { hmoId },
      { $set: input },
      { new: true, upsert: true }
    );
    return settings;
  }
}

export const hmsDashboardService = new HmsDashboardService();