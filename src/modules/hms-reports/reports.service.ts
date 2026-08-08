import { Types } from 'mongoose';
import { ReportModel } from './reports.model.js';
import { ClaimModel } from '../claims/claims.model.js';
import {
  GenerateReportInput,
  IReportDocument,
  PaginatedReportsResult,
  ReportQueryFilters,
  ReportStatus,
  ReportType,
} from './reports.types.js';

export class ReportsService {
  public async generateReport(
    hmoId: string,
    userId: string,
    input: GenerateReportInput
  ): Promise<IReportDocument> {
    const report = await ReportModel.create({
      ...input,
      hmoId: new Types.ObjectId(hmoId),
      generatedBy: new Types.ObjectId(userId),
      status: ReportStatus.PENDING,
    });

    try {
      let dataSummary: Record<string, unknown> = {};

      if (input.type === ReportType.CLAIMS_SUMMARY) {
        dataSummary = await this.aggregateClaimsSummary(hmoId, input.parameters);
      } else if (input.type === ReportType.FINANCIAL_OVERVIEW) {
        dataSummary = await this.aggregateFinancialOverview(hmoId, input.parameters);
      }

      report.status = ReportStatus.COMPLETED;
      report.dataSummary = dataSummary;
      await report.save();
    } catch (error) {
      report.status = ReportStatus.FAILED;
      await report.save();
      throw error;
    }

    return report;
  }

  public async getReportHistory(
    hmoId: string,
    filters: ReportQueryFilters
  ): Promise<PaginatedReportsResult> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      hmoId: new Types.ObjectId(hmoId),
    };

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    const [reports, total] = await Promise.all([
      ReportModel.find(query)
        .populate('generatedBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      ReportModel.countDocuments(query),
    ]);

    return {
      reports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getReportById(id: string, hmoId: string): Promise<IReportDocument | null> {
    return await ReportModel.findOne({
      _id: new Types.ObjectId(id),
      hmoId: new Types.ObjectId(hmoId),
    })
      .populate('generatedBy', 'firstName lastName email')
      .exec();
  }

  private async aggregateClaimsSummary(
    hmoId: string,
    params: { startDate?: string; endDate?: string; providerId?: string }
  ): Promise<Record<string, unknown>> {
    const matchQuery: Record<string, unknown> = {
      hmoId: new Types.ObjectId(hmoId),
    };

    if (params.providerId) {
      matchQuery.providerId = new Types.ObjectId(params.providerId);
    }

    if (params.startDate || params.endDate) {
      matchQuery.createdAt = {};
      if (params.startDate) {
        (matchQuery.createdAt as Record<string, unknown>).$gte = new Date(params.startDate);
      }
      if (params.endDate) {
        (matchQuery.createdAt as Record<string, unknown>).$lte = new Date(params.endDate);
      }
    }

    const metrics = await ClaimModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalClaimed: { $sum: '$totalClaimedAmount' },
          totalApproved: { $sum: { $ifNull: ['$totalApprovedAmount', 0] } },
        },
      },
    ]);

    return {
      generatedAt: new Date(),
      metrics,
    };
  }

  private async aggregateFinancialOverview(
    hmoId: string,
    params: { startDate?: string; endDate?: string }
  ): Promise<Record<string, unknown>> {
    const matchQuery: Record<string, unknown> = {
      hmoId: new Types.ObjectId(hmoId),
    };

    if (params.startDate || params.endDate) {
      matchQuery.createdAt = {};
      if (params.startDate) {
        (matchQuery.createdAt as Record<string, unknown>).$gte = new Date(params.startDate);
      }
      if (params.endDate) {
        (matchQuery.createdAt as Record<string, unknown>).$lte = new Date(params.endDate);
      }
    }

    const financialTotals = await ClaimModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalClaimsSubmitted: { $sum: 1 },
          totalClaimedAmount: { $sum: '$totalClaimedAmount' },
          totalApprovedAmount: { $sum: { $ifNull: ['$totalApprovedAmount', 0] } },
        },
      },
    ]);

    return {
      generatedAt: new Date(),
      overview: financialTotals[0] || {
        totalClaimsSubmitted: 0,
        totalClaimedAmount: 0,
        totalApprovedAmount: 0,
      },
    };
  }
}

export const reportsService = new ReportsService();