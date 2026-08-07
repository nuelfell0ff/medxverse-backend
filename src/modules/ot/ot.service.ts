import { Types } from 'mongoose';
import { SurgicalCaseModel } from './ot.model.js';
import {
  CreateSurgicalCaseInput,
  GetSurgicalCasesQuery,
  ISurgicalCaseDocument,
  UpdatePostOpNotesInput,
  UpdateSurgeryStatusInput,
  UpdateSurgicalTeamInput,
  SurgeryStatus,
} from './ot.types.js';

export class OTService {
  public async createCase(input: CreateSurgicalCaseInput): Promise<ISurgicalCaseDocument> {
    const surgicalTeam = input.surgicalTeam.map((member) => ({
      userId: new Types.ObjectId(member.userId),
      role: member.role,
    }));

    return SurgicalCaseModel.create({
      ...input,
      hospitalId: new Types.ObjectId(input.hospitalId),
      patientId: new Types.ObjectId(input.patientId),
      surgicalTeam,
      createdById: new Types.ObjectId(input.createdById),
      scheduledStartTime: new Date(input.scheduledStartTime),
      scheduledEndTime: input.scheduledEndTime ? new Date(input.scheduledEndTime) : undefined,
    });
  }

  public async getCases(
    hospitalId: string,
    query: GetSurgicalCasesQuery
  ): Promise<{ cases: ISurgicalCaseDocument[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hospitalId };

    if (query.status) filter.status = query.status;
    if (query.urgency) filter.urgency = query.urgency;
    if (query.otRoomNumber) filter.otRoomNumber = { $regex: query.otRoomNumber, $options: 'i' };
    if (query.patientId) filter.patientId = query.patientId;

    if (query.startDate || query.endDate) {
      filter.scheduledStartTime = {};
      if (query.startDate) {
        (filter.scheduledStartTime as Record<string, unknown>).$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        (filter.scheduledStartTime as Record<string, unknown>).$lte = new Date(query.endDate);
      }
    }

    const [cases, total] = await Promise.all([
      SurgicalCaseModel.find(filter)
        .populate('patientId', 'firstName lastName mrn dateOfBirth gender bloodGroup')
        .populate('surgicalTeam.userId', 'firstName lastName role specialization')
        .populate('createdById', 'firstName lastName role')
        .sort({ scheduledStartTime: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      SurgicalCaseModel.countDocuments(filter),
    ]);

    return {
      cases,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getCaseById(
    caseId: string,
    hospitalId: string
  ): Promise<ISurgicalCaseDocument | null> {
    return SurgicalCaseModel.findOne({ _id: caseId, hospitalId })
      .populate('patientId', 'firstName lastName mrn dateOfBirth gender bloodGroup phone allergies')
      .populate('surgicalTeam.userId', 'firstName lastName role specialization')
      .populate('createdById', 'firstName lastName role')
      .exec();
  }

  public async updateStatus(
    caseId: string,
    hospitalId: string,
    input: UpdateSurgeryStatusInput
  ): Promise<ISurgicalCaseDocument | null> {
    const updateData: Record<string, unknown> = {
      status: input.status,
    };

    if (input.status === SurgeryStatus.IN_PROGRESS) {
      updateData.actualStartTime = input.actualStartTime || new Date();
    }

    if (input.status === SurgeryStatus.COMPLETED) {
      updateData.actualEndTime = input.actualEndTime || new Date();
    }

    return SurgicalCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId },
      { $set: updateData },
      { new: true }
    ).exec();
  }

  public async updateSurgicalTeam(
    caseId: string,
    hospitalId: string,
    input: UpdateSurgicalTeamInput
  ): Promise<ISurgicalCaseDocument | null> {
    const surgicalTeam = input.surgicalTeam.map((member) => ({
      userId: new Types.ObjectId(member.userId),
      role: member.role,
    }));

    return SurgicalCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId },
      { $set: { surgicalTeam } },
      { new: true }
    ).exec();
  }

  public async updatePostOpNotes(
    caseId: string,
    hospitalId: string,
    input: UpdatePostOpNotesInput
  ): Promise<ISurgicalCaseDocument | null> {
    return SurgicalCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId },
      { $set: { postOpNotes: input.postOpNotes } },
      { new: true }
    ).exec();
  }
}

export const otService = new OTService();