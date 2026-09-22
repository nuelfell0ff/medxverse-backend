import { Types } from 'mongoose';

import { EnrolleeModel } from './enrollees.model.js';
import { EnrolleeCardModel } from './enrollees.card.model.js';
import { EnrolleeLifecycleModel } from './enrollees.lifecycle.model.js';
import {
  CreateEnrolleeInput,
  EnrolleeEligibilityResult,
  EnrolleeQueryFilters,
  EnrolleeStatus,
  EnrolleeStats,
  IEnrolleeDocument,
  PaginatedEnrolleesResult,
  UpdateEnrolleeInput,
  UpdateEnrolleeStatusInput,
  RenewEnrolleeInput,
  EnrolleeCardResult,
  EnrolleeLifecycleResult,
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

const STATUS_TRANSITIONS: Record<EnrolleeStatus, EnrolleeStatus[]> = {
  PENDING: ['ACTIVE', 'SUSPENDED', 'TERMINATED'],
  ACTIVE: ['SUSPENDED', 'TERMINATED'],
  SUSPENDED: ['ACTIVE', 'TERMINATED'],
  TERMINATED: [],
};

const actorId = (value?: string): Types.ObjectId | undefined =>
  value && Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : undefined;

const clean = (value?: string | null): string | undefined => {
  const v = value?.trim();
  return v || undefined;
};


export class EnrolleesService {
  private async recordLifecycle(
    hmoId: Types.ObjectId,
    enrolleeId: Types.ObjectId,
    type: string,
    options: { fromStatus?: EnrolleeStatus; toStatus?: EnrolleeStatus; reason?: string; actorId?: string; metadata?: Record<string, unknown> } = {},
  ): Promise<void> {
    await EnrolleeLifecycleModel.create({
      hmoId,
      enrolleeId,
      type,
      fromStatus: options.fromStatus,
      toStatus: options.toStatus,
      reason: clean(options.reason),
      actorId: actorId(options.actorId),
      metadata: options.metadata,
    });
  }

  private cardNumber(policyNumber: string): string {
    return `MXV-${policyNumber.trim().toUpperCase()}`;
  }

  private async ensureCard(hmoId: Types.ObjectId, enrollee: IEnrolleeDocument, actor?: string): Promise<EnrolleeCardResult> {
    let card = await EnrolleeCardModel.findOne({ hmoId, enrolleeId: enrollee._id, status: 'ACTIVE' }).exec();
    if (!card) {
      card = await EnrolleeCardModel.create({
        hmoId,
        enrolleeId: enrollee._id,
        cardNumber: this.cardNumber(enrollee.policyNumber),
        status: 'ACTIVE',
        issuedAt: new Date(),
        expiresAt: enrollee.endDate,
      });
      await this.recordLifecycle(hmoId, enrollee._id, 'CARD_ISSUED', {
        actorId: actor,
        metadata: { cardNumber: card.cardNumber },
      });
    } else if (card.expiresAt?.getTime() !== enrollee.endDate?.getTime()) {
      card.expiresAt = enrollee.endDate;
      await card.save();
    }
    return {
      cardNumber: card.cardNumber,
      status: card.status,
      enrolleeId: String(enrollee._id),
      policyNumber: enrollee.policyNumber,
      issuedAt: card.issuedAt,
      expiresAt: card.expiresAt,
    };
  }
  public async createEnrollee(
    hmoId: string,
    input: CreateEnrolleeInput,
    actor?: string
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
      const enrollee = await EnrolleeModel.create({
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

      await this.recordLifecycle(hmoObjectId, enrollee._id, 'ENROLLED', {
        toStatus: enrollee.status,
        actorId: actor,
        metadata: { benefitPlanId: String(enrollee.benefitPlanId), relationship: enrollee.relationship },
      });
      await this.ensureCard(hmoObjectId, enrollee, actor);
      return enrollee;
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
    input: UpdateEnrolleeInput,
    actor?: string
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

    const hmoObjectId = toObjectId(hmoId, 'HMO ID');
    try {
      const updated = await EnrolleeModel.findOneAndUpdate(
        {
          _id: toObjectId(id, 'enrollee ID'),
          hmoId: hmoObjectId,
        },
        { $set: updateData },
        { new: true, runValidators: true }
      )
        .populate('benefitPlanId')
        .populate('primaryProviderId')
        .populate('primaryMemberId', 'firstName lastName policyNumber email phone status')
        .exec();

      if (updated) {
        await this.recordLifecycle(hmoObjectId, updated._id, 'UPDATED', { actorId: actor });
        await this.ensureCard(hmoObjectId, updated, actor);
      }
      return updated;
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
    input: UpdateEnrolleeStatusInput,
    actor?: string,
  ): Promise<IEnrolleeDocument | null> {
    if (!Object.keys(STATUS_TRANSITIONS).includes(input.status)) {
      throw new Error('Invalid enrollee status');
    }

    const hmoObjectId = toObjectId(hmoId, 'HMO ID');
    const enrolleeId = toObjectId(id, 'enrollee ID');
    const current = await EnrolleeModel.findOne({ _id: enrolleeId, hmoId: hmoObjectId }).exec();
    if (!current) return null;
    if (current.status === input.status) return current;
    if (!STATUS_TRANSITIONS[current.status as EnrolleeStatus].includes(input.status)) {
      throw new Error(`Invalid enrollee status transition: ${current.status} -> ${input.status}`);
    }
    if ((input.status === 'SUSPENDED' || input.status === 'TERMINATED') && !input.reason?.trim()) {
      throw new Error(`A ${input.status.toLowerCase()} reason is required`);
    }

    const updated = await EnrolleeModel.findOneAndUpdate(
      { _id: enrolleeId, hmoId: hmoObjectId },
      { $set: { status: input.status } },
      { new: true, runValidators: true },
    ).exec();
    if (!updated) return null;

    const eventType = input.status === 'TERMINATED' ? 'TERMINATED' : input.status === 'SUSPENDED' ? 'SUSPENDED' : input.status === 'ACTIVE' ? (current.status === 'SUSPENDED' ? 'REACTIVATED' : 'ACTIVATED') : 'UPDATED';
    await this.recordLifecycle(hmoObjectId, updated._id, eventType, {
      fromStatus: current.status, toStatus: updated.status, reason: input.reason, actorId: actor,
    });

    if (updated.status === 'ACTIVE') {
      await this.ensureCard(hmoObjectId, updated, actor);
    } else {
      await EnrolleeCardModel.updateMany(
        { hmoId: hmoObjectId, enrolleeId: updated._id, status: 'ACTIVE' },
        { $set: { status: 'REVOKED' } },
      ).exec();
    }
    return updated;
  }

  public async renewEnrollee(
    id: string,
    hmoId: string,
    input: RenewEnrolleeInput,
    actor?: string,
  ): Promise<IEnrolleeDocument | null> {
    const hmoObjectId = toObjectId(hmoId, 'HMO ID');
    const enrolleeId = toObjectId(id, 'enrollee ID');
    const current = await EnrolleeModel.findOne({ _id: enrolleeId, hmoId: hmoObjectId }).exec();
    if (!current) return null;
    if (current.status === 'TERMINATED') throw new Error('A terminated enrollee cannot be renewed');

    const newEndDate = toDate(input.endDate, 'renewal end date');
    const baseline = current.endDate && current.endDate > new Date() ? current.endDate : new Date();
    if (newEndDate <= baseline) throw new Error('Renewal end date must extend the current coverage');

    const updated = await EnrolleeModel.findOneAndUpdate(
      { _id: enrolleeId, hmoId: hmoObjectId },
      { $set: { endDate: newEndDate, status: 'ACTIVE' } },
      { new: true, runValidators: true },
    ).exec();
    if (!updated) return null;

    await this.recordLifecycle(hmoObjectId, updated._id, 'RENEWED', {
      fromStatus: current.status, toStatus: updated.status, reason: input.reason, actorId: actor,
      metadata: { previousEndDate: current.endDate, newEndDate },
    });
    await this.ensureCard(hmoObjectId, updated, actor);
    return updated;
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
  public async getCard(id: string, hmoId: string, actor?: string): Promise<EnrolleeCardResult | null> {
    const hmoObjectId = toObjectId(hmoId, 'HMO ID');
    const enrollee = await EnrolleeModel.findOne({ _id: toObjectId(id, 'enrollee ID'), hmoId: hmoObjectId }).exec();
    if (!enrollee) return null;
    if (enrollee.status !== 'ACTIVE') throw new Error('A digital HMO card is only available for an active enrollee');
    return this.ensureCard(hmoObjectId, enrollee, actor);
  }

  public async getLifecycle(id: string, hmoId: string): Promise<EnrolleeLifecycleResult[]> {
    const events = await EnrolleeLifecycleModel.find({
      enrolleeId: toObjectId(id, 'enrollee ID'),
      hmoId: toObjectId(hmoId, 'HMO ID'),
    }).sort({ createdAt: -1, _id: -1 }).limit(200).lean().exec();

    return events.map((event: any) => ({
      _id: String(event._id),
      type: event.type,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      reason: event.reason,
      actorId: event.actorId ? String(event.actorId) : undefined,
      metadata: event.metadata as Record<string, unknown> | undefined,
      createdAt: event.createdAt,
    }));
  }
}

export const enrolleesService = new EnrolleesService();
