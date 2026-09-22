import { Types } from 'mongoose';

import { EnrolleeModel } from './enrollees.model.js';
import {
  CreateEnrolleeInput,
  EnrolleeEligibilityResult,
  EnrolleeQueryFilters,
  EnrolleeStatus,
  EnrolleeStats,
  IEnrolleeDocument,
  PaginatedEnrolleesResult,
  UpdateEnrolleeInput,
} from './enrollees.types.js';

const toObjectId = (value: string, field: string): Types.ObjectId => {
  if (!value || !Types.ObjectId.isValid(value)) {
    throw new Error(`Invalid ${field}`);
  }
  return new Types.ObjectId(value);
};

const toDate = (value: Date | string, field: string): Date => {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${field}`);
  }
  return date;
};

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

export class EnrolleesService {
  public async createEnrollee(
    hmoId: string,
    input: CreateEnrolleeInput
  ): Promise<IEnrolleeDocument> {
    const hmoObjectId = toObjectId(hmoId, 'HMO ID');

    if (!input.policyNumber?.trim()) throw new Error('Policy number is required');
    if (!input.firstName?.trim()) throw new Error('First name is required');
    if (!input.lastName?.trim()) throw new Error('Last name is required');
    if (!input.email?.trim()) throw new Error('Email is required');
    if (!input.phone?.trim()) throw new Error('Phone number is required');
    if (!input.gender) throw new Error('Gender is required');
    if (!input.benefitPlanId) throw new Error('Benefit plan is required');

    const dateOfBirth = toDate(input.dateOfBirth, 'date of birth');
    if (dateOfBirth > new Date()) throw new Error('Date of birth cannot be in the future');

    const startDate = input.startDate ? toDate(input.startDate, 'start date') : new Date();
    const endDate = input.endDate ? toDate(input.endDate, 'end date') : undefined;

    if (endDate && endDate < startDate) {
      throw new Error('End date cannot be earlier than start date');
    }

    if (input.relationship && input.relationship !== 'PRIMARY' && !input.primaryMemberId) {
      throw new Error('A primary member is required for a dependent enrollee');
    }

    if (input.primaryMemberId) {
      const primaryMemberId = toObjectId(input.primaryMemberId, 'primary member ID');
      const primary = await EnrolleeModel.findOne({
        _id: primaryMemberId,
        hmoId: hmoObjectId,
      }).select('_id relationship');

      if (!primary) throw new Error('Primary member not found for this HMO');
      if (primary.relationship !== 'PRIMARY') {
        throw new Error('A dependent must be linked to a primary member');
      }
    }

    try {
      return await EnrolleeModel.create({
        hmoId: hmoObjectId,
        policyNumber: input.policyNumber.trim().toUpperCase(),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        otherNames: input.otherNames?.trim() || undefined,
        email: normalizeEmail(input.email),
        phone: input.phone.trim(),
        gender: input.gender,
        dateOfBirth,
        maritalStatus: input.maritalStatus,
        address: input.address,
        benefitPlanId: toObjectId(input.benefitPlanId, 'benefit plan ID'),
        primaryProviderId: input.primaryProviderId
          ? toObjectId(input.primaryProviderId, 'primary provider ID')
          : undefined,
        relationship: input.relationship || 'PRIMARY',
        primaryMemberId: input.primaryMemberId
          ? toObjectId(input.primaryMemberId, 'primary member ID')
          : undefined,
        status: input.status || 'ACTIVE',
        startDate,
        endDate,
        photoUrl: input.photoUrl?.trim() || undefined,
      });
    } catch (error: unknown) {
      const mongoError = error as { code?: number };
      if (mongoError.code === 11000) {
        throw new Error('A member with this policy number already exists for this HMO');
      }
      throw error;
    }
  }

  public async getEnrollees(
    hmoId: string,
    filters: EnrolleeQueryFilters
  ): Promise<PaginatedEnrolleesResult> {
    const hmoObjectId = toObjectId(hmoId, 'HMO ID');
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { hmoId: hmoObjectId };

    if (filters.status) query.status = filters.status;
    if (filters.relationship) query.relationship = filters.relationship;
    if (filters.benefitPlanId) {
      query.benefitPlanId = toObjectId(filters.benefitPlanId, 'benefit plan ID');
    }

    if (filters.search?.trim()) {
      const regex = new RegExp(escapeRegex(filters.search.trim()), 'i');
      query.$or = [
        { firstName: regex },
        { lastName: regex },
        { otherNames: regex },
        { policyNumber: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    const [enrollees, total] = await Promise.all([
      EnrolleeModel.find(query)
        .populate('benefitPlanId', 'name code category status')
        .populate('primaryProviderId', 'name code state')
        .populate('primaryMemberId', 'firstName lastName policyNumber email')
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      EnrolleeModel.countDocuments(query),
    ]);

    return {
      enrollees,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getEnrolleeById(
    id: string,
    hmoId: string
  ): Promise<IEnrolleeDocument | null> {
    return EnrolleeModel.findOne({
      _id: toObjectId(id, 'enrollee ID'),
      hmoId: toObjectId(hmoId, 'HMO ID'),
    })
      .populate('benefitPlanId')
      .populate('primaryProviderId')
      .populate('primaryMemberId', 'firstName lastName policyNumber email phone status')
      .exec();
  }

  public async updateEnrollee(
    id: string,
    hmoId: string,
    input: UpdateEnrolleeInput
  ): Promise<IEnrolleeDocument | null> {
    const updateData: Record<string, unknown> = {};

    if (input.firstName !== undefined) updateData.firstName = input.firstName.trim();
    if (input.lastName !== undefined) updateData.lastName = input.lastName.trim();
    if (input.otherNames !== undefined) updateData.otherNames = input.otherNames.trim() || undefined;
    if (input.email !== undefined) updateData.email = normalizeEmail(input.email);
    if (input.phone !== undefined) updateData.phone = input.phone.trim();
    if (input.gender !== undefined) updateData.gender = input.gender;
    if (input.maritalStatus !== undefined) updateData.maritalStatus = input.maritalStatus;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.relationship !== undefined) updateData.relationship = input.relationship;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.photoUrl !== undefined) updateData.photoUrl = input.photoUrl?.trim() || undefined;

    if (input.dateOfBirth !== undefined) {
      const dateOfBirth = toDate(input.dateOfBirth, 'date of birth');
      if (dateOfBirth > new Date()) throw new Error('Date of birth cannot be in the future');
      updateData.dateOfBirth = dateOfBirth;
    }

    if (input.startDate !== undefined) {
      updateData.startDate = toDate(input.startDate, 'start date');
    }

    if (input.endDate !== undefined) {
      updateData.endDate = input.endDate === null ? undefined : toDate(input.endDate, 'end date');
    }

    if (input.benefitPlanId !== undefined) {
      updateData.benefitPlanId = toObjectId(input.benefitPlanId, 'benefit plan ID');
    }

    if (input.primaryProviderId !== undefined) {
      updateData.primaryProviderId = input.primaryProviderId
        ? toObjectId(input.primaryProviderId, 'primary provider ID')
        : undefined;
    }

    if (input.primaryMemberId !== undefined) {
      if (!input.primaryMemberId) {
        updateData.primaryMemberId = undefined;
      } else {
        const primaryMemberId = toObjectId(input.primaryMemberId, 'primary member ID');
        const primary = await EnrolleeModel.findOne({
          _id: primaryMemberId,
          hmoId: toObjectId(hmoId, 'HMO ID'),
        }).select('_id relationship');

        if (!primary) throw new Error('Primary member not found for this HMO');
        if (primary.relationship !== 'PRIMARY') {
          throw new Error('A dependent must be linked to a primary member');
        }
        updateData.primaryMemberId = primaryMemberId;
      }
    }

    const current = await EnrolleeModel.findOne({
      _id: toObjectId(id, 'enrollee ID'),
      hmoId: toObjectId(hmoId, 'HMO ID'),
    });

    if (!current) return null;

    const nextStartDate = (updateData.startDate as Date | undefined) || current.startDate;
    const nextEndDate = Object.prototype.hasOwnProperty.call(updateData, 'endDate')
      ? (updateData.endDate as Date | undefined)
      : current.endDate;

    if (nextEndDate && nextEndDate < nextStartDate) {
      throw new Error('End date cannot be earlier than start date');
    }

    const nextRelationship =
      (updateData.relationship as string | undefined) || current.relationship;
    const nextPrimaryMemberId = Object.prototype.hasOwnProperty.call(updateData, 'primaryMemberId')
      ? updateData.primaryMemberId
      : current.primaryMemberId;

    if (nextRelationship !== 'PRIMARY' && !nextPrimaryMemberId) {
      throw new Error('A primary member is required for a dependent enrollee');
    }

    try {
      return await EnrolleeModel.findOneAndUpdate(
        {
          _id: toObjectId(id, 'enrollee ID'),
          hmoId: toObjectId(hmoId, 'HMO ID'),
        },
        { $set: updateData },
        { new: true, runValidators: true }
      )
        .populate('benefitPlanId')
        .populate('primaryProviderId')
        .populate('primaryMemberId', 'firstName lastName policyNumber email phone status')
        .exec();
    } catch (error: unknown) {
      const mongoError = error as { code?: number };
      if (mongoError.code === 11000) {
        throw new Error('A member with this policy number already exists for this HMO');
      }
      throw error;
    }
  }

  public async updateEnrolleeStatus(
    id: string,
    hmoId: string,
    status: EnrolleeStatus
  ): Promise<IEnrolleeDocument | null> {
    if (!['ACTIVE', 'SUSPENDED', 'TERMINATED', 'PENDING'].includes(status)) {
      throw new Error('Invalid enrollee status');
    }

    return EnrolleeModel.findOneAndUpdate(
      {
        _id: toObjectId(id, 'enrollee ID'),
        hmoId: toObjectId(hmoId, 'HMO ID'),
      },
      { $set: { status } },
      { new: true, runValidators: true }
    ).exec();
  }

  public async getDependents(
    primaryMemberId: string,
    hmoId: string
  ): Promise<IEnrolleeDocument[]> {
    return EnrolleeModel.find({
      primaryMemberId: toObjectId(primaryMemberId, 'primary member ID'),
      hmoId: toObjectId(hmoId, 'HMO ID'),
    })
      .populate('benefitPlanId', 'name code category status')
      .populate('primaryProviderId', 'name code state')
      .sort({ createdAt: -1 })
      .exec();
  }

  public async getStats(hmoId: string): Promise<EnrolleeStats> {
    const hmoObjectId = toObjectId(hmoId, 'HMO ID');
    const today = new Date();
    const inThirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [total, active, pending, suspended, terminated, primaryMembers, dependents, expiringSoon] =
      await Promise.all([
        EnrolleeModel.countDocuments({ hmoId: hmoObjectId }),
        EnrolleeModel.countDocuments({ hmoId: hmoObjectId, status: 'ACTIVE' }),
        EnrolleeModel.countDocuments({ hmoId: hmoObjectId, status: 'PENDING' }),
        EnrolleeModel.countDocuments({ hmoId: hmoObjectId, status: 'SUSPENDED' }),
        EnrolleeModel.countDocuments({ hmoId: hmoObjectId, status: 'TERMINATED' }),
        EnrolleeModel.countDocuments({ hmoId: hmoObjectId, relationship: 'PRIMARY' }),
        EnrolleeModel.countDocuments({ hmoId: hmoObjectId, relationship: { $ne: 'PRIMARY' } }),
        EnrolleeModel.countDocuments({
          hmoId: hmoObjectId,
          status: 'ACTIVE',
          endDate: { $gte: today, $lte: inThirtyDays },
        }),
      ]);

    return { total, active, pending, suspended, terminated, primaryMembers, dependents, expiringSoon };
  }

  public async checkEligibility(
    id: string,
    hmoId: string,
    onDate = new Date()
  ): Promise<EnrolleeEligibilityResult> {
    const enrollee = await EnrolleeModel.findOne({
      _id: toObjectId(id, 'enrollee ID'),
      hmoId: toObjectId(hmoId, 'HMO ID'),
    }).select('_id policyNumber benefitPlanId status startDate endDate');

    if (!enrollee) throw new Error('Enrollee not found');

    const date = new Date(onDate);
    if (Number.isNaN(date.getTime())) throw new Error('Invalid eligibility date');

    const withinDates = date >= enrollee.startDate && (!enrollee.endDate || date <= enrollee.endDate);
    const eligible = enrollee.status === 'ACTIVE' && withinDates;

    let reason: string | undefined;
    if (enrollee.status !== 'ACTIVE') {
      reason = `Enrollee status is ${enrollee.status}`;
    } else if (date < enrollee.startDate) {
      reason = 'Coverage has not started';
    } else if (enrollee.endDate && date > enrollee.endDate) {
      reason = 'Coverage has expired';
    }

    return {
      eligible,
      status: enrollee.status,
      policyNumber: enrollee.policyNumber,
      enrolleeId: String(enrollee._id),
      benefitPlanId: String(enrollee.benefitPlanId),
      coverageStartDate: enrollee.startDate,
      coverageEndDate: enrollee.endDate,
      reason,
    };
  }
}

export const enrolleesService = new EnrolleesService();
