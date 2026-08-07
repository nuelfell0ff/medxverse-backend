import { Types } from 'mongoose';
import { EmergencyCaseModel } from './emergency.model.js';
import {
  CreateEmergencyCaseInput,
  GetEmergencyCasesQuery,
  IEmergencyCaseDocument,
  UpdateTriageInput,
  UpdateEmergencyStatusInput,
} from './emergency.types.js';

export class EmergencyService {
  public async createCase(input: CreateEmergencyCaseInput): Promise<IEmergencyCaseDocument> {
    return EmergencyCaseModel.create({
      ...input,
      patientId: input.patientId ? new Types.ObjectId(input.patientId) : undefined,
      attendingDoctorId: input.attendingDoctorId
        ? new Types.ObjectId(input.attendingDoctorId)
        : undefined,
      triagedById: new Types.ObjectId(input.triagedById),
    });
  }

  public async getCases(
    hospitalId: string,
    query: GetEmergencyCasesQuery
  ): Promise<{ cases: IEmergencyCaseDocument[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hospitalId };

    if (query.status) filter.status = query.status;
    if (query.triageCategory) filter.triageCategory = query.triageCategory;
    if (query.traumaType) filter.traumaType = query.traumaType;
    if (query.patientId) filter.patientId = query.patientId;
    if (typeof query.isUnidentified === 'boolean') filter.isUnidentified = query.isUnidentified;

    const [cases, total] = await Promise.all([
      EmergencyCaseModel.find(filter)
        .populate('patientId', 'firstName lastName mrn dateOfBirth gender phone')
        .populate('attendingDoctorId', 'firstName lastName role')
        .populate('triagedById', 'firstName lastName role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      EmergencyCaseModel.countDocuments(filter),
    ]);

    return {
      cases,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getCaseById(caseId: string, hospitalId: string): Promise<IEmergencyCaseDocument | null> {
    return EmergencyCaseModel.findOne({ _id: caseId, hospitalId })
      .populate('patientId', 'firstName lastName mrn dateOfBirth gender phone bloodGroup')
      .populate('attendingDoctorId', 'firstName lastName role')
      .populate('triagedById', 'firstName lastName role')
      .populate('admittedToWardId', 'name wardNumber')
      .exec();
  }

  public async updateTriage(
    caseId: string,
    hospitalId: string,
    input: UpdateTriageInput
  ): Promise<IEmergencyCaseDocument | null> {
    const updateData: Record<string, unknown> = {
      triageCategory: input.triageCategory,
    };

    if (input.triageVitals) updateData.triageVitals = input.triageVitals;
    if (input.assignedBay) updateData.assignedBay = input.assignedBay;
    if (input.attendingDoctorId) {
      updateData.attendingDoctorId = new Types.ObjectId(input.attendingDoctorId);
    }

    return EmergencyCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId },
      { $set: updateData },
      { new: true }
    ).exec();
  }

  public async updateStatus(
    caseId: string,
    hospitalId: string,
    input: UpdateEmergencyStatusInput
  ): Promise<IEmergencyCaseDocument | null> {
    const updateData: Record<string, unknown> = {
      status: input.status,
    };

    if (input.dispositionNotes) updateData.dispositionNotes = input.dispositionNotes;
    if (input.admittedToWardId) {
      updateData.admittedToWardId = new Types.ObjectId(input.admittedToWardId);
    }
    if (input.transferredToFacility) updateData.transferredToFacility = input.transferredToFacility;

    return EmergencyCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId },
      { $set: updateData },
      { new: true }
    ).exec();
  }
}

export const emergencyService = new EmergencyService();