import { Types } from 'mongoose';
import {
  AdmissionRequestSource,
  AssignmentStatus,
  BedStatus,
  BedStatusEventType,
  CompleteCleaningInput,
  ConfirmBedAssignmentInput,
  CreateBedInput,
  CreateTransferRequestInput,
  CreateWardInput,
  GetBedQuery,
  HospitalCapacityDashboard,
  IBedRequirements,
  TransitionBedInput,
  TransferRequestStatus,
  WardDashboardItem,
} from './bed-ward.types.js';
import {
  BedAssignmentModel,
  BedModel,
  BedStatusEventModel,
  OccupancyForecastModel,
  TransferRequestModel,
  WardModel,
} from './bed-ward.model.js';
import { bedMatchingService } from './bed-matching.service.js';
import { bedWardEvents, emitBedBoardChanged, emitHousekeeping } from './bed-ward.events.js';

const TERMINAL_ASSIGNMENT_STATUSES = [AssignmentStatus.RELEASED, AssignmentStatus.CANCELLED];

const TRANSITIONS: Record<BedStatus, BedStatus[]> = {
  [BedStatus.AVAILABLE]: [BedStatus.OCCUPIED, BedStatus.BLOCKED],
  [BedStatus.OCCUPIED]: [BedStatus.CLEANING, BedStatus.BLOCKED],
  [BedStatus.CLEANING]: [BedStatus.AVAILABLE, BedStatus.BLOCKED],
  [BedStatus.BLOCKED]: [BedStatus.AVAILABLE],
};

function objectId(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new Error(`Invalid ObjectId: ${id}`);
  return new Types.ObjectId(id);
}

function cleanRequirements(input: IBedRequirements = {}): IBedRequirements {
  return {
    acuityLevel: input.acuityLevel ? Number(input.acuityLevel) : undefined,
    department: input.department?.trim(),
    bedType: input.bedType?.trim().toUpperCase(),
    isolation: input.isolation === true,
    negativePressure: input.negativePressure === true,
    oxygen: input.oxygen === true,
    cardiacMonitor: input.cardiacMonitor === true,
    pediatric: input.pediatric === true,
    bariatric: input.bariatric === true,
    mentalHealthSafeSpace: input.mentalHealthSafeSpace === true,
    gender: input.gender?.trim(),
  };
}

export class BedWardService {
  public async createWard(input: CreateWardInput) {
    return WardModel.create({
      hospitalId: objectId(input.hospitalId),
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      department: input.department?.trim(),
      floor: input.floor?.trim(),
      building: input.building?.trim(),
      specialty: input.specialty?.trim(),
      notes: input.notes?.trim(),
      active: true,
    });
  }

  public async getWards(hospitalId: string) {
    return WardModel.find({ hospitalId: objectId(hospitalId), active: true }).sort({ name: 1 }).lean().exec();
  }

  public async createBed(input: CreateBedInput) {
    const hospitalId = objectId(input.hospitalId);
    const wardId = objectId(input.wardId);
    const ward = await WardModel.findOne({ _id: wardId, hospitalId, active: true }).exec();
    if (!ward) throw new Error('Active ward not found.');

    const bed = await BedModel.create({
      hospitalId,
      wardId,
      bedNumber: input.bedNumber.trim().toUpperCase(),
      bedType: input.bedType.trim().toUpperCase(),
      status: BedStatus.AVAILABLE,
      version: 0,
      capabilities: input.capabilities || {},
      supportedAcuityLevels: input.supportedAcuityLevels?.length ? input.supportedAcuityLevels : [1, 2, 3, 4, 5],
      genderRestriction: input.genderRestriction?.trim(),
      notes: input.notes?.trim(),
    });

    await BedStatusEventModel.create({
      hospitalId,
      bedId: bed._id,
      wardId,
      toStatus: BedStatus.AVAILABLE,
      eventType: BedStatusEventType.CREATED,
      actorId: undefined,
      occurredAt: new Date(),
      version: bed.version,
      reason: 'Bed created.',
    });

    emitBedBoardChanged({
      hospitalId: String(hospitalId),
      wardId: String(wardId),
      bedId: String(bed._id),
      event: 'BED_CREATED',
      occurredAt: new Date().toISOString(),
      version: bed.version,
    });
    return bed;
  }

  public async getBeds(hospitalId: string, query: GetBedQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const filter: Record<string, unknown> = { hospitalId: objectId(hospitalId) };

    if (query.wardId) filter.wardId = objectId(query.wardId);
    if (query.status) filter.status = query.status;
    if (query.bedType) filter.bedType = query.bedType.toUpperCase();
    if (query.search?.trim()) filter.bedNumber = { $regex: query.search.trim(), $options: 'i' };

    if (query.department?.trim()) {
      const wards = await WardModel.find({
        hospitalId: objectId(hospitalId),
        department: new RegExp(`^${query.department.trim()}$`, 'i'),
        active: true,
      }).select('_id').lean().exec();
      filter.wardId = { $in: wards.map((ward) => ward._id) };
    }

    const [beds, total] = await Promise.all([
      BedModel.find(filter).sort({ wardId: 1, bedNumber: 1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
      BedModel.countDocuments(filter),
    ]);

    return { beds, total, page, totalPages: Math.ceil(total / limit) };
  }

  public async findBedByWardAndNumber(wardId: string, bedNumber: string, hospitalId: string) {
    if (!Types.ObjectId.isValid(wardId)) return null;
    return BedModel.findOne({
      wardId: objectId(wardId),
      hospitalId: objectId(hospitalId),
      bedNumber: bedNumber.trim().toUpperCase(),
    }).exec();
  }

  public async getBedById(bedId: string, hospitalId: string) {
    return BedModel.findOne({ _id: objectId(bedId), hospitalId: objectId(hospitalId) }).exec();
  }

  public async transitionBed(bedId: string, hospitalId: string, input: TransitionBedInput) {
    const bedObjectId = objectId(bedId);
    const hospitalObjectId = objectId(hospitalId);
    const actorId = input.actorId ? objectId(input.actorId) : undefined;

    const current = await BedModel.findOne({ _id: bedObjectId, hospitalId: hospitalObjectId }).exec();
    if (!current) throw new Error('Bed not found.');

    if (input.expectedVersion !== undefined && current.version !== input.expectedVersion) {
      throw new Error('Bed has changed since it was loaded. Refresh the bed and retry.');
    }

    if (current.status === input.status) return current;
    const currentStatus = current.status as BedStatus;
    if (!TRANSITIONS[currentStatus].includes(input.status)) {
      throw new Error(`Invalid bed transition: ${currentStatus} → ${input.status}.`);
    }

    if (input.status === BedStatus.OCCUPIED && !input.patientId && !current.patientId) {
      throw new Error('A patient is required before a bed can become occupied.');
    }

    if (input.status === BedStatus.AVAILABLE && current.patientId) {
      throw new Error('Release the patient assignment before returning the bed to available.');
    }

    const now = new Date();
    const update: Record<string, unknown> = {
      status: input.status,
      version: current.version + 1,
    };

    if (input.status === BedStatus.CLEANING) {
      update.cleaningStartedAt = now;
      update.cleaningCompletedAt = undefined;
      update.patientId = undefined;
      update.admissionId = undefined;
      update.currentAssignmentId = undefined;
    } else if (input.status === BedStatus.AVAILABLE) {
      update.cleaningCompletedAt = now;
      update.lastReleasedAt = now;
      update.blockedReason = undefined;
      update.patientId = undefined;
      update.admissionId = undefined;
      update.currentAssignmentId = undefined;
    } else if (input.status === BedStatus.BLOCKED) {
      update.blockedReason = input.reason?.trim() || 'Bed blocked/out of service.';
    } else if (input.status === BedStatus.OCCUPIED) {
      update.patientId = input.patientId ? objectId(input.patientId) : current.patientId;
      update.lastOccupiedAt = now;
      update.blockedReason = undefined;
    }

    const updated = await BedModel.findOneAndUpdate(
      { _id: bedObjectId, hospitalId: hospitalObjectId, status: current.status, version: current.version },
      { $set: update },
      { new: true },
    ).exec();

    if (!updated) {
      throw new Error('Bed changed concurrently. The requested transition was not applied.');
    }

    const eventType =
      input.status === BedStatus.CLEANING
        ? BedStatusEventType.CLEANING_REQUESTED
        : input.status === BedStatus.AVAILABLE && current.status === BedStatus.CLEANING
          ? BedStatusEventType.CLEANING_COMPLETED
          : input.status === BedStatus.BLOCKED
            ? BedStatusEventType.BLOCKED
            : input.status === BedStatus.AVAILABLE && current.status === BedStatus.BLOCKED
              ? BedStatusEventType.UNBLOCKED
              : BedStatusEventType.STATUS_CHANGED;

    await BedStatusEventModel.create({
      hospitalId: hospitalObjectId,
      bedId: updated._id,
      wardId: updated.wardId,
      fromStatus: current.status,
      toStatus: updated.status,
      eventType,
      actorId,
      patientId: input.patientId ? objectId(input.patientId) : current.patientId,
      assignmentId: input.assignmentId ? objectId(input.assignmentId) : current.currentAssignmentId,
      occurredAt: now,
      version: updated.version,
      reason: input.reason,
      metadata: input.metadata,
    });

    if (input.status === BedStatus.CLEANING) {
      emitHousekeeping({
        hospitalId,
        wardId: String(updated.wardId),
        bedId: String(updated._id),
        task: 'CLEANING_REQUIRED',
        occurredAt: now.toISOString(),
        patientId: input.patientId || (current.patientId ? String(current.patientId) : undefined),
      });
    }

    emitBedBoardChanged({
      hospitalId,
      wardId: String(updated.wardId),
      bedId: String(updated._id),
      patientId: input.patientId,
      event: 'BED_STATUS_CHANGED',
      occurredAt: now.toISOString(),
      version: updated.version,
    });

    return updated;
  }

  public async completeCleaning(bedId: string, hospitalId: string, input: CompleteCleaningInput) {
    const bed = await BedModel.findOne({ _id: objectId(bedId), hospitalId: objectId(hospitalId) }).exec();
    if (!bed) throw new Error('Bed not found.');
    if (bed.status !== BedStatus.CLEANING) throw new Error('Bed is not currently in cleaning state.');

    const result = await this.transitionBed(bedId, hospitalId, {
      status: BedStatus.AVAILABLE,
      actorId: input.actorId,
      expectedVersion: input.expectedVersion,
      reason: input.notes || 'Housekeeping confirmed cleaning complete.',
    });

    emitHousekeeping({
      hospitalId,
      wardId: String(result.wardId),
      bedId: String(result._id),
      task: 'CLEANING_COMPLETED',
      occurredAt: new Date().toISOString(),
    });

    return result;
  }

  public async suggestBeds(input: import('./bed-ward.types.js').BedMatchRequest) {
    return bedMatchingService.suggest(input);
  }

  public async confirmAssignment(input: ConfirmBedAssignmentInput, hospitalId: string) {
    const hospitalObjectId = objectId(hospitalId);
    const bedObjectId = objectId(input.bedId);
    const requestedById = objectId(input.requestedById);
    const requirements = cleanRequirements(input.requirements);

    // Atomic acquisition is the final source of truth. A stale suggestion
    // can never cause a double-booking.
    const current = await BedModel.findOne({ _id: bedObjectId, hospitalId: hospitalObjectId }).exec();
    if (!current) throw new Error('Bed not found.');
    if (current.status !== BedStatus.AVAILABLE) throw new Error('Bed is no longer available.');
    if (requirements.acuityLevel && !current.supportedAcuityLevels.includes(requirements.acuityLevel)) {
      throw new Error('Bed does not support the requested acuity.');
    }

    const ward = await WardModel.findOne({ _id: current.wardId, hospitalId: hospitalObjectId, active: true }).exec();
    if (!ward) throw new Error('Bed ward is inactive or unavailable.');

    const assignment = await BedAssignmentModel.create({
      hospitalId: hospitalObjectId,
      bedId: current._id,
      wardId: current.wardId,
      patientId: input.patientId ? objectId(input.patientId) : undefined,
      admissionId: input.admissionId ? objectId(input.admissionId) : undefined,
      source: input.source,
      status: AssignmentStatus.ACTIVE,
      reservedAt: new Date(),
      assignedAt: new Date(),
      assignedById: requestedById,
      reason: input.reason,
      requirements,
    });

    try {
      const updated = await BedModel.findOneAndUpdate(
        { _id: current._id, hospitalId: hospitalObjectId, status: BedStatus.AVAILABLE, version: current.version },
        {
          $set: {
            status: BedStatus.OCCUPIED,
            patientId: input.patientId ? objectId(input.patientId) : undefined,
            admissionId: input.admissionId ? objectId(input.admissionId) : undefined,
            currentAssignmentId: assignment._id,
            lastOccupiedAt: new Date(),
            version: current.version + 1,
          },
        },
        { new: true },
      ).exec();

      if (!updated) {
        await BedAssignmentModel.updateOne(
          { _id: assignment._id },
          { $set: { status: AssignmentStatus.CANCELLED, releasedAt: new Date(), releasedById: requestedById } },
        ).exec();
        throw new Error('Bed was assigned by another process. Please choose another bed.');
      }

      await BedStatusEventModel.create({
        hospitalId: hospitalObjectId,
        bedId: updated._id,
        wardId: updated.wardId,
        fromStatus: BedStatus.AVAILABLE,
        toStatus: BedStatus.OCCUPIED,
        eventType: BedStatusEventType.ASSIGNED,
        actorId: requestedById,
        patientId: input.patientId ? objectId(input.patientId) : undefined,
        assignmentId: assignment._id,
        occurredAt: new Date(),
        version: updated.version,
        reason: input.reason || 'Bed assignment confirmed.',
      });

      emitBedBoardChanged({
        hospitalId,
        wardId: String(updated.wardId),
        bedId: String(updated._id),
        patientId: input.patientId,
        event: 'BED_ASSIGNED',
        occurredAt: new Date().toISOString(),
        version: updated.version,
      });

      return assignment;
    } catch (error) {
      // The assignment is never left active if the bed update fails.
      if (error instanceof Error && error.message.includes('Bed was assigned')) throw error;
      await BedAssignmentModel.updateOne(
        { _id: assignment._id, status: AssignmentStatus.ACTIVE },
        { $set: { status: AssignmentStatus.CANCELLED, releasedAt: new Date(), releasedById: requestedById } },
      ).exec();
      throw error;
    }
  }

  public async releaseAssignment(
    bedId: string,
    hospitalId: string,
    actorId: string,
    reason?: string,
    expectedVersion?: number,
  ) {
    const hospitalObjectId = objectId(hospitalId);
    const bed = await BedModel.findOne({ _id: objectId(bedId), hospitalId: hospitalObjectId }).exec();
    if (!bed) throw new Error('Bed not found.');
    const assignment = await BedAssignmentModel.findOne({
      hospitalId: hospitalObjectId,
      bedId: bed._id,
      status: { $in: [AssignmentStatus.ACTIVE, AssignmentStatus.RESERVED] },
    }).sort({ assignedAt: -1 }).exec();

    if (!assignment) {
      if (bed.status === BedStatus.OCCUPIED) {
        throw new Error('Occupied bed has no active assignment.');
      }
      return null;
    }

    assignment.status = AssignmentStatus.RELEASED;
    assignment.releasedAt = new Date();
    assignment.releasedById = objectId(actorId);
    assignment.reason = reason || assignment.reason;
    await assignment.save();

    const updated = await this.transitionBed(bedId, hospitalId, {
      status: BedStatus.CLEANING,
      actorId,
      patientId: bed.patientId ? String(bed.patientId) : undefined,
      assignmentId: String(assignment._id),
      expectedVersion: expectedVersion ?? bed.version,
      reason: reason || 'Patient discharged/transferred; cleaning required.',
    });

    return { assignment, bed: updated };
  }

  public async createAdmissionRequest(input: {
    hospitalId: string;
    patientId: string;
    requirements: IBedRequirements;
    source: import('./bed-ward.types.js').AdmissionRequestSource;
    requestedById: string;
    admissionId?: string;
    reason?: string;
  }) {
    const request = await TransferRequestModel.create({
      hospitalId: objectId(input.hospitalId),
      patientId: objectId(input.patientId),
      requirements: cleanRequirements(input.requirements),
      source: input.source,
      status: TransferRequestStatus.REQUESTED,
      requestedById: objectId(input.requestedById),
      reason: input.reason?.trim(),
    });

    const suggestions = await this.suggestBeds({
      hospitalId: input.hospitalId,
      patientId: input.patientId,
      requirements: input.requirements,
      source: input.source,
      requestedById: input.requestedById,
      admissionId: input.admissionId,
    });

    if (suggestions[0]) {
      request.toBedId = suggestions[0].bed._id;
      request.toWardId = suggestions[0].ward._id;
      request.status = TransferRequestStatus.MATCHED;
      request.matchedAt = new Date();
      await request.save();
    }

    emitBedBoardChanged({
      hospitalId: input.hospitalId,
      wardId: request.toWardId ? String(request.toWardId) : undefined,
      patientId: input.patientId,
      event: 'ADMISSION_BED_REQUEST_CREATED',
      occurredAt: new Date().toISOString(),
    });

    return { request, suggestions };
  }

  public async createTransferRequest(input: CreateTransferRequestInput) {
    const request = await TransferRequestModel.create({
      hospitalId: objectId(input.hospitalId),
      patientId: objectId(input.patientId),
      fromWardId: input.fromWardId ? objectId(input.fromWardId) : undefined,
      fromBedId: input.fromBedId ? objectId(input.fromBedId) : undefined,
      requirements: cleanRequirements(input.requirements),
      source: input.source,
      status: TransferRequestStatus.REQUESTED,
      requestedById: objectId(input.requestedById),
      reason: input.reason?.trim(),
      notes: input.notes?.trim(),
    });

    const suggestions = await this.suggestBeds({
      hospitalId: input.hospitalId,
      patientId: input.patientId,
      requirements: input.requirements,
      source: input.source,
      requestedById: input.requestedById,
    });

    if (suggestions[0]) {
      request.toBedId = suggestions[0].bed._id;
      request.toWardId = suggestions[0].ward._id;
      request.status = TransferRequestStatus.MATCHED;
      request.matchedAt = new Date();
      await request.save();
    }

    emitBedBoardChanged({
      hospitalId: input.hospitalId,
      wardId: request.toWardId ? String(request.toWardId) : undefined,
      patientId: input.patientId,
      event: 'TRANSFER_REQUEST_CREATED',
      occurredAt: new Date().toISOString(),
    });

    return { request, suggestions };
  }

  public async completeTransfer(requestId: string, hospitalId: string, actorId: string) {
    const request = await TransferRequestModel.findOne({
      _id: objectId(requestId),
      hospitalId: objectId(hospitalId),
    }).exec();
    if (!request) throw new Error('Transfer request not found.');
    if (!request.toBedId) throw new Error('Transfer request has no destination bed.');
    if (![TransferRequestStatus.MATCHED, TransferRequestStatus.ACCEPTED, TransferRequestStatus.IN_PROGRESS].includes(request.status)) {
      throw new Error(`Transfer request cannot be completed from ${request.status}.`);
    }

    const assignment = await this.confirmAssignment({
      bedId: String(request.toBedId),
      patientId: String(request.patientId),
      requestedById: actorId,
      source: AdmissionRequestSource.INTERNAL_TRANSFER,
      requirements: request.requirements as IBedRequirements,
      reason: request.reason || 'Internal transfer.',
    }, hospitalId);

    request.status = TransferRequestStatus.COMPLETED;
    request.completedAt = new Date();
    request.toBedId = assignment.bedId;
    request.toWardId = assignment.wardId;
    await request.save();

    if (request.fromBedId) {
      try {
        await this.releaseAssignment(String(request.fromBedId), hospitalId, actorId, 'Patient transferred to another bed.');
      } catch (error) {
        console.error('[BedWard] Source bed cleaning trigger failed after destination assignment:', error);
      }
    }

    return { request, assignment };
  }

  public async getDashboard(hospitalId: string): Promise<HospitalCapacityDashboard> {
    const hospitalObjectId = objectId(hospitalId);
    const [wards, beds] = await Promise.all([
      WardModel.find({ hospitalId: hospitalObjectId, active: true }).exec(),
      BedModel.find({ hospitalId: hospitalObjectId }).lean().exec(),
    ]);

    const byWard = new Map<string, WardDashboardItem>();
    for (const ward of wards) {
      byWard.set(String(ward._id), {
        wardId: String(ward._id),
        code: ward.code,
        name: ward.name,
        department: ward.department,
        totalBeds: 0,
        occupied: 0,
        available: 0,
        cleaning: 0,
        blocked: 0,
        occupancyRate: 0,
      });
    }

    for (const bed of beds) {
      const item = byWard.get(String(bed.wardId));
      if (!item) continue;
      item.totalBeds += 1;
      if (bed.status === BedStatus.OCCUPIED) item.occupied += 1;
      if (bed.status === BedStatus.AVAILABLE) item.available += 1;
      if (bed.status === BedStatus.CLEANING) item.cleaning += 1;
      if (bed.status === BedStatus.BLOCKED) item.blocked += 1;
    }

    let totalBeds = 0, occupied = 0, available = 0, cleaning = 0, blocked = 0;
    for (const item of byWard.values()) {
      item.occupancyRate = item.totalBeds ? Number((item.occupied / item.totalBeds).toFixed(4)) : 0;
      totalBeds += item.totalBeds;
      occupied += item.occupied;
      available += item.available;
      cleaning += item.cleaning;
      blocked += item.blocked;
    }

    return {
      hospitalId,
      totalBeds,
      occupied,
      available,
      cleaning,
      blocked,
      occupancyRate: totalBeds ? Number((occupied / totalBeds).toFixed(4)) : 0,
      wards: Array.from(byWard.values()).sort((a, b) => a.name.localeCompare(b.name)),
      generatedAt: new Date().toISOString(),
    };
  }

  public async getStatusHistory(bedId: string, hospitalId: string, limit = 100) {
    return BedStatusEventModel.find({
      bedId: objectId(bedId),
      hospitalId: objectId(hospitalId),
    }).sort({ occurredAt: -1 }).limit(Math.min(500, Math.max(1, limit))).lean().exec();
  }

  public async getTransferRequests(hospitalId: string, status?: TransferRequestStatus) {
    return TransferRequestModel.find({
      hospitalId: objectId(hospitalId),
      ...(status ? { status } : {}),
    }).sort({ createdAt: -1 }).limit(100).lean().exec();
  }

  public async getHousekeepingStream() {
    return bedWardEvents;
  }

  public async getForecasts(hospitalId: string, wardId?: string, horizonDays = 7) {
    return OccupancyForecastModel.find({
      hospitalId: objectId(hospitalId),
      ...(wardId ? { wardId: objectId(wardId) } : {}),
      horizonDays,
      forecastDate: { $gte: new Date() },
    }).sort({ forecastDate: 1 }).lean().exec();
  }
}

export const bedWardService = new BedWardService();
