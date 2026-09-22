import { Types } from 'mongoose';

import { ClaimModel } from './claims.model.js';

import {
  ClaimQueryFilters,
  CreateClaimInput,
  IClaimDocument,
  IClaimItem,
  PaginatedClaimsResult,
  UpdateClaimStatusInput,
  ClaimStatus,
} from './claims.types.js';

const isObjectId = (value: string): boolean =>
  Types.ObjectId.isValid(value);

const toObjectId = (
  value: string,
  field: string
): Types.ObjectId => {
  if (!isObjectId(value)) {
    throw new Error(`Invalid ${field}`);
  }

  return new Types.ObjectId(value);
};

const normalizeMoney = (value: number): number => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(
      'Amount must be a finite number greater than or equal to 0'
    );
  }

  return Math.round((value + Number.EPSILON) * 100) / 100;
};

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const allowedTransitions: Record<ClaimStatus, ClaimStatus[]> = {
  SUBMITTED: [
    'UNDER_REVIEW',
    'APPROVED',
    'REJECTED',
    'CANCELLED',
  ],

  UNDER_REVIEW: [
    'APPROVED',
    'REJECTED',
    'CANCELLED',
  ],

  APPROVED: [
    'PAID',
    'CANCELLED',
  ],

  REJECTED: [],

  PAID: [],

  CANCELLED: [],
};

/**
 * Runtime-safe ClaimStatus guard.
 *
 * This prevents TypeScript from treating values coming from
 * Mongoose / request payloads as arbitrary `any` values.
 */
const isClaimStatus = (value: unknown): value is ClaimStatus => {
  return (
    value === 'SUBMITTED' ||
    value === 'UNDER_REVIEW' ||
    value === 'APPROVED' ||
    value === 'REJECTED' ||
    value === 'PAID' ||
    value === 'CANCELLED'
  );
};

export class ClaimsService {
  public async createClaim(
    hmoId: string,
    input: CreateClaimInput
  ): Promise<IClaimDocument> {
    const hmoObjectId = toObjectId(hmoId, 'HMO ID');
    const memberObjectId = toObjectId(
      input.memberId,
      'member ID'
    );
    const providerObjectId = toObjectId(
      input.providerId,
      'provider ID'
    );

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

    if (
      !Array.isArray(input.items) ||
      input.items.length === 0
    ) {
      throw new Error(
        'Claim must contain at least one item'
      );
    }

    const formattedItems: IClaimItem[] =
      input.items.map((item, index) => {
        if (!item.description?.trim()) {
          throw new Error(
            `Claim item ${index + 1}: description is required`
          );
        }

        if (
          !Number.isInteger(item.quantity) ||
          item.quantity < 1
        ) {
          throw new Error(
            `Claim item ${index + 1}: quantity must be a positive integer`
          );
        }

        const unitPrice = normalizeMoney(
          Number(item.unitPrice)
        );

        return {
          code: item.code?.trim() || undefined,
          description: item.description.trim(),
          category: item.category,
          quantity: item.quantity,
          unitPrice,
          claimedAmount: normalizeMoney(
            item.quantity * unitPrice
          ),
        };
      });

    const totalClaimedAmount = normalizeMoney(
      formattedItems.reduce(
        (sum, item) => sum + item.claimedAmount,
        0
      )
    );

    try {
      return await ClaimModel.create({
        hmoId: hmoObjectId,
        claimNumber: input.claimNumber
          .trim()
          .toUpperCase(),

        memberId: memberObjectId,
        providerId: providerObjectId,

        diagnosis: input.diagnosis.trim(),

        icdCode:
          input.icdCode?.trim().toUpperCase() ||
          undefined,

        treatmentDate,
        submissionDate: new Date(),

        items: formattedItems,

        totalClaimedAmount,

        status: 'SUBMITTED',

        notes: input.notes?.trim() || undefined,
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new Error(
          'A claim with this claim number already exists for this HMO'
        );
      }

      throw error;
    }
  }

  public async getClaims(
    hmoId: string,
    filters: ClaimQueryFilters
  ): Promise<PaginatedClaimsResult> {
    const hmoObjectId = toObjectId(
      hmoId,
      'HMO ID'
    );

    const page = Math.max(
      1,
      Number(filters.page) || 1
    );

    const limit = Math.max(
      1,
      Math.min(
        100,
        Number(filters.limit) || 20
      )
    );

    const skip = (page - 1) * limit;

    const query: Record<string, any> = {
      hmoId: hmoObjectId,
    };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.memberId) {
      query.memberId = toObjectId(
        filters.memberId,
        'member ID'
      );
    }

    if (filters.providerId) {
      query.providerId = toObjectId(
        filters.providerId,
        'provider ID'
      );
    }

    if (
      filters.startDate ||
      filters.endDate
    ) {
      const treatmentDate: Record<
        string,
        Date
      > = {};

      if (filters.startDate) {
        const date = new Date(
          filters.startDate
        );

        if (Number.isNaN(date.getTime())) {
          throw new Error(
            'Invalid start date'
          );
        }

        treatmentDate.$gte = date;
      }

      if (filters.endDate) {
        const date = new Date(
          filters.endDate
        );

        if (Number.isNaN(date.getTime())) {
          throw new Error(
            'Invalid end date'
          );
        }

        // Make date-only end dates inclusive
        // through the end of that day.
        if (
          /^\d{4}-\d{2}-\d{2}$/.test(
            String(filters.endDate)
          )
        ) {
          date.setHours(
            23,
            59,
            59,
            999
          );
        }

        treatmentDate.$lte = date;
      }

      query.treatmentDate =
        treatmentDate;
    }

    if (filters.search?.trim()) {
      const searchRegex = new RegExp(
        escapeRegex(
          filters.search.trim()
        ),
        'i'
      );

      query.$or = [
        {
          claimNumber: searchRegex,
        },
        {
          diagnosis: searchRegex,
        },
        {
          icdCode: searchRegex,
        },
      ];
    }

    const [claims, total] =
      await Promise.all([
        ClaimModel.find(query)
          .populate(
            'memberId',
            'firstName lastName policyNumber email phone'
          )
          .populate(
            'providerId',
            'name code state'
          )
          .populate(
            'adjudicatedBy',
            'firstName lastName email'
          )
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
      totalPages: Math.ceil(
        total / limit
      ),
    };
  }

  public async getClaimById(
    id: string,
    hmoId: string
  ): Promise<IClaimDocument | null> {
    return ClaimModel.findOne({
      _id: toObjectId(
        id,
        'claim ID'
      ),

      hmoId: toObjectId(
        hmoId,
        'HMO ID'
      ),
    })
      .populate('memberId')
      .populate('providerId')
      .populate(
        'adjudicatedBy',
        'firstName lastName email'
      )
      .exec();
  }

  public async updateClaimStatus(
    id: string,
    hmoId: string,
    userId: string,
    input: UpdateClaimStatusInput
  ): Promise<IClaimDocument | null> {
    const claim =
      await ClaimModel.findOne({
        _id: toObjectId(
          id,
          'claim ID'
        ),

        hmoId: toObjectId(
          hmoId,
          'HMO ID'
        ),
      });

    if (!claim) {
      return null;
    }

    /**
     * Explicitly narrow the current status.
     *
     * This fixes TS7053 when indexing
     * allowedTransitions.
     */
    const currentStatus: ClaimStatus =
      isClaimStatus(claim.status)
        ? claim.status
        : (() => {
            throw new Error(
              `Invalid current claim status: ${String(
                claim.status
              )}`
            );
          })();

    /**
     * Explicitly validate the incoming status
     * before using it in transition logic.
     */
    const nextStatus: ClaimStatus =
      isClaimStatus(input.status)
        ? input.status
        : (() => {
            throw new Error(
              `Invalid claim status: ${String(
                input.status
              )}`
            );
          })();

    const transitions =
      allowedTransitions[currentStatus];

    if (!transitions.includes(nextStatus)) {
      throw new Error(
        `Invalid claim status transition: ${currentStatus} -> ${nextStatus}`
      );
    }

    const adjudicatorId = toObjectId(
      userId,
      'user ID'
    );

    if (
      nextStatus === 'REJECTED' &&
      !input.rejectionReason?.trim()
    ) {
      throw new Error(
        'A rejection reason is required when rejecting a claim'
      );
    }

    if (input.approvedItems) {
      if (nextStatus !== 'APPROVED') {
        throw new Error(
          'Approved item amounts can only be supplied when approving a claim'
        );
      }

      const seen = new Set<number>();

      let totalApproved = 0;

      for (
        const approved of input.approvedItems
      ) {
        if (
          !Number.isInteger(
            approved.itemIndex
          ) ||
          approved.itemIndex < 0 ||
          approved.itemIndex >=
            claim.items.length
        ) {
          throw new Error(
            `Invalid approved item index: ${approved.itemIndex}`
          );
        }

        if (
          seen.has(
            approved.itemIndex
          )
        ) {
          throw new Error(
            `Duplicate approved item index: ${approved.itemIndex}`
          );
        }

        seen.add(
          approved.itemIndex
        );

        const amount =
          normalizeMoney(
            Number(
              approved.approvedAmount
            )
          );

        const claimed =
          claim.items[
            approved.itemIndex
          ].claimedAmount;

        if (amount > claimed) {
          throw new Error(
            `Approved amount for item ${
              approved.itemIndex + 1
            } cannot exceed claimed amount`
          );
        }

        claim.items[
          approved.itemIndex
        ].approvedAmount =
          amount;

        totalApproved += amount;
      }

      claim.totalApprovedAmount =
        normalizeMoney(
          totalApproved
        );
    } else if (
      nextStatus === 'APPROVED'
    ) {
      claim.totalApprovedAmount =
        claim.totalClaimedAmount;

      claim.items.forEach(
        (item: IClaimItem) => {
          item.approvedAmount =
            item.claimedAmount;
        }
      );
    }

    if (
      nextStatus === 'REJECTED'
    ) {
      claim.totalApprovedAmount = 0;

      claim.items.forEach(
        (item: IClaimItem) => {
          item.approvedAmount = 0;
        }
      );
    }

    claim.status = nextStatus;

    claim.adjudicatedBy =
      adjudicatorId;

    claim.adjudicatedAt =
      new Date();

    if (
      input.rejectionReason?.trim()
    ) {
      claim.rejectionReason =
        input.rejectionReason.trim();
    }

    if (
      input.notes !== undefined
    ) {
      claim.notes =
        input.notes?.trim() ||
        undefined;
    }

    return claim.save();
  }

  public async getMemberClaims(
    memberId: string,
    hmoId: string
  ): Promise<IClaimDocument[]> {
    return ClaimModel.find({
      memberId: toObjectId(
        memberId,
        'member ID'
      ),

      hmoId: toObjectId(
        hmoId,
        'HMO ID'
      ),
    })
      .populate(
        'providerId',
        'name code'
      )
      .sort({
        createdAt: -1,
        _id: -1,
      })
      .exec();
  }
}

export const claimsService =
  new ClaimsService();