import { Types } from 'mongoose';
import { SurgeryCaseModel } from './surgery.model.js';
import {
  CreateSurgeryCaseInput,
  GetSurgeryCasesQuery,
  ISurgeryCaseDocument,
  SurgeryStatus,
  UpdatePreOpInput,
  UpdateConsentInput,
  UpdateWHOChecklistInput,
  AddVitalsLogInput,
  UpdateIntraopInput,
  CompleteSurgeryInput,
} from './surgery.types.js';

export class SurgeryService {
  public async scheduleCase(input: CreateSurgeryCaseInput): Promise<ISurgeryCaseDocument> {
    const conflictingCase = await SurgeryCaseModel.findOne({
      hospitalId: input.hospitalId,
      theatreId: input.theatreId,
      status: { $in: [SurgeryStatus.SCHEDULED, SurgeryStatus.PRE_OP_PREPARATION, SurgeryStatus.IN_PROGRESS] },
      $or: [
        {
          scheduledStartTime: { $lt: input.scheduledEndTime },
          scheduledEndTime: { $gt: input.scheduledStartTime },
        },
      ],
    });

    if (conflictingCase) {
      throw new Error(`Operating Theatre ${input.theatreId} is already booked for this time slot.`);
    }

    const surgicalTeam = (input.surgicalTeam || []).map((member) => ({
      userId: new Types.ObjectId(member.userId),
      role: member.role,
      credentialVerified: member.credentialVerified ?? true,
      notes: member.notes,
    }));

    return SurgeryCaseModel.create({
      ...input,
      surgicalTeam,
      status: SurgeryStatus.SCHEDULED,
    });
  }

  public async getCases(
    hospitalId: string,
    query: GetSurgeryCasesQuery
  ): Promise<{ cases: ISurgeryCaseDocument[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hospitalId };

    if (query.status) filter.status = query.status;
    if (query.theatreId) filter.theatreId = query.theatreId;
    if (query.leadSurgeonId) filter.leadSurgeonId = query.leadSurgeonId;
    if (query.patientId) filter.patientId = query.patientId;

    if (query.date) {
      const startOfDay = new Date(query.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(query.date);
      endOfDay.setHours(23, 59, 59, 999);
      filter.scheduledStartTime = { $gte: startOfDay, $lte: endOfDay };
    }

    const [cases, total] = await Promise.all([
      SurgeryCaseModel.find(filter)
        .populate('patientId', 'firstName lastName mrn gender dateOfBirth')
        .populate('leadSurgeonId', 'firstName lastName role')
        .populate('surgicalTeam.userId', 'firstName lastName role')
        .sort({ scheduledStartTime: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      SurgeryCaseModel.countDocuments(filter),
    ]);

    return {
      cases,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getCaseById(caseId: string, hospitalId: string): Promise<ISurgeryCaseDocument | null> {
    return SurgeryCaseModel.findOne({ _id: caseId, hospitalId })
      .populate('patientId', 'firstName lastName mrn gender dateOfBirth')
      .populate('leadSurgeonId', 'firstName lastName role')
      .populate('surgicalTeam.userId', 'firstName lastName role')
      .exec();
  }

  public async updatePreOpAssessment(
    caseId: string,
    hospitalId: string,
    input: UpdatePreOpInput
  ): Promise<ISurgeryCaseDocument | null> {
    const existingCase = await SurgeryCaseModel.findOne({ _id: caseId, hospitalId });
    if (!existingCase) return null;

    const preOp = existingCase.preOpAssessment || {};

    if (input.asaClassification) preOp.asaClassification = input.asaClassification;
    if (input.mallampatiScore) preOp.mallampatiScore = input.mallampatiScore;
    if (input.vteRiskScore) preOp.vteRiskScore = input.vteRiskScore;
    if (input.infectionScreeningNotes) preOp.infectionScreeningNotes = input.infectionScreeningNotes;
    if (input.pregnancyStatus) preOp.pregnancyStatus = input.pregnancyStatus;
    if (input.preOpVitals) preOp.preOpVitals = { ...preOp.preOpVitals, ...input.preOpVitals };

    if (input.clearedForSurgery !== undefined) {
      preOp.clearedForSurgery = input.clearedForSurgery;
      if (input.clearedForSurgery) {
        preOp.clearedAt = new Date();
        if (input.clearedBy) preOp.clearedBy = new Types.ObjectId(input.clearedBy);
      }
    }

    return SurgeryCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId },
      { $set: { preOpAssessment: preOp, status: SurgeryStatus.PRE_OP_PREPARATION } },
      { new: true }
    ).exec();
  }

  public async updateConsent(
    caseId: string,
    hospitalId: string,
    input: UpdateConsentInput
  ): Promise<ISurgeryCaseDocument | null> {
    const consent = {
      ...input,
      signedAt: new Date(),
    };

    return SurgeryCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId },
      { $set: { consent } },
      { new: true }
    ).exec();
  }

  public async updateWHOChecklist(
    caseId: string,
    hospitalId: string,
    input: UpdateWHOChecklistInput
  ): Promise<ISurgeryCaseDocument | null> {
    const existingCase = await SurgeryCaseModel.findOne({ _id: caseId, hospitalId });
    if (!existingCase) return null;

    const checklist = existingCase.whoChecklist || {
      signIn: { completed: false },
      timeOut: { completed: false },
      signOut: { completed: false },
    };

    const stageData = {
      ...input.data,
      completed: true,
      completedAt: new Date(),
      completedBy: new Types.ObjectId(input.completedBy),
    };

    checklist[input.stage] = stageData as unknown as typeof checklist[typeof input.stage];

    return SurgeryCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId },
      { $set: { whoChecklist: checklist } },
      { new: true }
    ).exec();
  }

  public async addVitalsLog(
    caseId: string,
    hospitalId: string,
    input: AddVitalsLogInput
  ): Promise<ISurgeryCaseDocument | null> {
    const vitalsLog = {
      ...input,
      timestamp: new Date(),
    };

    return SurgeryCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId },
      { $push: { vitalsTimeline: vitalsLog } },
      { new: true }
    ).exec();
  }

  public async startSurgery(caseId: string, hospitalId: string): Promise<ISurgeryCaseDocument | null> {
    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
        status: { $in: [SurgeryStatus.SCHEDULED, SurgeryStatus.PRE_OP_PREPARATION] },
      },
      {
        $set: {
          status: SurgeryStatus.IN_PROGRESS,
          actualStartTime: new Date(),
          'intraopDocs.incisionTime': new Date(),
        },
      },
      { new: true }
    ).exec();
  }

  public async updateIntraopDocs(
    caseId: string,
    hospitalId: string,
    input: UpdateIntraopInput
  ): Promise<ISurgeryCaseDocument | null> {
    const existingCase = await SurgeryCaseModel.findOne({ _id: caseId, hospitalId });
    if (!existingCase) return null;

    const updatedDocs = { ...(existingCase.intraopDocs || {}), ...input };
    delete updatedDocs.consumablesUsed;
    delete updatedDocs.equipmentChecklist;

    const updateQuery: Record<string, unknown> = {
      $set: { intraopDocs: updatedDocs },
    };

    if (input.consumablesUsed) {
      updateQuery.$set = { ...updateQuery.$set, consumablesUsed: input.consumablesUsed };
    }
    if (input.equipmentChecklist) {
      updateQuery.$set = { ...updateQuery.$set, equipmentChecklist: input.equipmentChecklist };
    }

    return SurgeryCaseModel.findOneAndUpdate({ _id: caseId, hospitalId }, updateQuery, { new: true }).exec();
  }

  public async completeSurgery(
    caseId: string,
    hospitalId: string,
    input: CompleteSurgeryInput
  ): Promise<ISurgeryCaseDocument | null> {
    const existingCase = await SurgeryCaseModel.findOne({ _id: caseId, hospitalId });
    if (!existingCase) return null;

    const now = new Date();
    const intraopDocs = {
      ...(existingCase.intraopDocs || {}),
      ...(input.intraopDocs || {}),
      closureTime: now,
    };

    return SurgeryCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId, status: SurgeryStatus.IN_PROGRESS },
      {
        $set: {
          status: SurgeryStatus.COMPLETED,
          actualEndTime: now,
          anesthesiaNotes: input.anesthesiaNotes,
          postOpNotes: input.postOpNotes,
          intraopDocs,
        },
      },
      { new: true }
    ).exec();
  }

  public async cancelCase(
    caseId: string,
    hospitalId: string,
    cancellationReason: string
  ): Promise<ISurgeryCaseDocument | null> {
    return SurgeryCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId, status: { $ne: SurgeryStatus.COMPLETED } },
      {
        $set: {
          status: SurgeryStatus.CANCELLED,
          cancellationReason,
        },
      },
      { new: true }
    ).exec();
  }
}

export const surgeryService = new SurgeryService();
                           
