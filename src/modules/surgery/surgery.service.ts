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
  UpdateAnesthesiaInput,
  PriorityLevel,
  SurgicalRole,
  UrgencyLevel,
} from './surgery.types.js';

export class SurgeryService {
  private readonly activeStatuses = [
    SurgeryStatus.SCHEDULED,
    SurgeryStatus.PRE_OP_PREPARATION,
    SurgeryStatus.IN_PROGRESS,
  ];

  private validateTimeRange(start: Date, end: Date): void {
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new Error('Invalid surgery date/time.');
    }

    if (end <= start) {
      throw new Error('Scheduled end time must be after scheduled start time.');
    }
  }

  private calculateDuration(start: Date, end: Date): number {
    return Math.ceil((end.getTime() - start.getTime()) / 60000);
  }

  private async checkConflicts(
    hospitalId: string,
    theatreId: string,
    start: Date,
    end: Date,
    excludeCaseId?: string,
    leadSurgeonId?: string,
    surgicalTeam?: CreateSurgeryCaseInput['surgicalTeam']
  ): Promise<void> {
    const baseFilter: Record<string, unknown> = {
      hospitalId,
      status: { $in: this.activeStatuses },
      $or: [
        {
          scheduledStartTime: { $lt: end },
          scheduledEndTime: { $gt: start },
        },
      ],
    };

    if (excludeCaseId) {
      baseFilter._id = { $ne: excludeCaseId };
    }

    const theatreConflict = await SurgeryCaseModel.findOne({
      ...baseFilter,
      theatreId,
    });

    if (theatreConflict) {
      throw new Error(
        `Operating Theatre ${theatreId} is already booked for this time slot.`
      );
    }

    if (leadSurgeonId) {
      const surgeonConflict = await SurgeryCaseModel.findOne({
        ...baseFilter,
        leadSurgeonId,
      });

      if (surgeonConflict) {
        throw new Error('The lead surgeon is already assigned to another surgery during this time.');
      }
    }

    const teamIds =
      surgicalTeam
        ?.map((member) => member.userId)
        .filter(Boolean) || [];

    if (teamIds.length) {
      const teamConflict = await SurgeryCaseModel.findOne({
        ...baseFilter,
        'surgicalTeam.userId': {
          $in: teamIds.map((id) => new Types.ObjectId(id)),
        },
      });

      if (teamConflict) {
        throw new Error('One or more surgical team members are already assigned during this time.');
      }
    }
  }

  public async scheduleCase(
    input: CreateSurgeryCaseInput
  ): Promise<ISurgeryCaseDocument> {
    const start = new Date(input.scheduledStartTime);
    const end = new Date(input.scheduledEndTime);

    this.validateTimeRange(start, end);

    await this.checkConflicts(
      input.hospitalId,
      input.theatreId,
      start,
      end,
      undefined,
      input.leadSurgeonId,
      input.surgicalTeam
    );

    const surgicalTeam = (input.surgicalTeam || []).map((member) => ({
      userId: new Types.ObjectId(member.userId),
      role: member.role,
      credentialVerified: member.credentialVerified ?? false,
      available: member.available ?? true,
      notes: member.notes,
    }));

    const leadAlreadyAssigned = surgicalTeam.some(
      (member) =>
        member.userId.toString() === input.leadSurgeonId &&
        member.role === SurgicalRole.PRIMARY_SURGEON
    );

    if (!leadAlreadyAssigned) {
      surgicalTeam.unshift({
        userId: new Types.ObjectId(input.leadSurgeonId),
        role: SurgicalRole.PRIMARY_SURGEON,
        credentialVerified: false,
        available: true,
      });
    }

    const estimatedDurationMinutes =
      input.estimatedDurationMinutes ||
      this.calculateDuration(start, end);

    return SurgeryCaseModel.create({
      ...input,
      hospitalId: new Types.ObjectId(input.hospitalId),
      patientId: new Types.ObjectId(input.patientId),
      leadSurgeonId: new Types.ObjectId(input.leadSurgeonId),
      scheduledStartTime: start,
      scheduledEndTime: end,
      estimatedDurationMinutes,
      urgency: input.urgency || UrgencyLevel.ELECTIVE,
      priority: input.priority || PriorityLevel.NORMAL,
      surgicalTeam,
      status: SurgeryStatus.SCHEDULED,
    });
  }

  public async rescheduleCase(
    caseId: string,
    hospitalId: string,
    startTime: Date,
    endTime: Date
  ): Promise<ISurgeryCaseDocument | null> {
    this.validateTimeRange(startTime, endTime);

    const existingCase = await SurgeryCaseModel.findOne({
      _id: caseId,
      hospitalId,
    });

    if (!existingCase) return null;

    if (
      [SurgeryStatus.IN_PROGRESS, SurgeryStatus.COMPLETED].includes(
        existingCase.status
      )
    ) {
      throw new Error('This surgery cannot be rescheduled.');
    }

    await this.checkConflicts(
      hospitalId,
      existingCase.theatreId,
      startTime,
      endTime,
      caseId,
      existingCase.leadSurgeonId.toString(),
      existingCase.surgicalTeam.map((member) => ({
        userId: member.userId.toString(),
        role: member.role,
      }))
    );

    return SurgeryCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId },
      {
        $set: {
          scheduledStartTime: startTime,
          scheduledEndTime: endTime,
          estimatedDurationMinutes: this.calculateDuration(startTime, endTime),
          status: SurgeryStatus.SCHEDULED,
        },
      },
      { new: true }
    ).exec();
  }

  public async getCases(
    hospitalId: string,
    query: GetSurgeryCasesQuery
  ): Promise<{
    cases: ISurgeryCaseDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      hospitalId,
    };

    if (query.status) filter.status = query.status;
    if (query.urgency) filter.urgency = query.urgency;
    if (query.priority) filter.priority = query.priority;
    if (query.theatreId) filter.theatreId = query.theatreId;
    if (query.leadSurgeonId) filter.leadSurgeonId = query.leadSurgeonId;
    if (query.patientId) filter.patientId = query.patientId;

    if (query.date) {
      const startOfDay = new Date(`${query.date}T00:00:00.000`);
      const endOfDay = new Date(`${query.date}T23:59:59.999`);

      filter.scheduledStartTime = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }

    const [cases, total] = await Promise.all([
      SurgeryCaseModel.find(filter)
        .populate(
          'patientId',
          'firstName lastName mrn gender dateOfBirth'
        )
        .populate(
          'leadSurgeonId',
          'firstName lastName role'
        )
        .populate(
          'surgicalTeam.userId',
          'firstName lastName role'
        )
        .sort({
          scheduledStartTime: 1,
          priority: -1,
        })
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

  public async getCaseById(
    caseId: string,
    hospitalId: string
  ): Promise<ISurgeryCaseDocument | null> {
    return SurgeryCaseModel.findOne({
      _id: caseId,
      hospitalId,
    })
      .populate(
        'patientId',
        'firstName lastName mrn gender dateOfBirth'
      )
      .populate(
        'leadSurgeonId',
        'firstName lastName role'
      )
      .populate(
        'surgicalTeam.userId',
        'firstName lastName role'
      )
      .exec();
  }

  public async updatePreOpAssessment(
    caseId: string,
    hospitalId: string,
    input: UpdatePreOpInput
  ): Promise<ISurgeryCaseDocument | null> {
    const existingCase = await SurgeryCaseModel.findOne({
      _id: caseId,
      hospitalId,
    });

    if (!existingCase) return null;

    const current = existingCase.preOpAssessment
      ? existingCase.preOpAssessment.toObject()
      : {};

    const preOp = {
      ...current,
      ...input,
      preOpVitals: {
        ...(current.preOpVitals || {}),
        ...(input.preOpVitals || {}),
      },
      optimizationChecklist: {
        ...(current.optimizationChecklist || {}),
        ...(input.optimizationChecklist || {}),
      },
    };

    if (input.clearedForSurgery === true) {
      preOp.clearedAt = new Date();
    }

    return SurgeryCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId },
      {
        $set: {
          preOpAssessment: preOp,
          status: SurgeryStatus.PRE_OP_PREPARATION,
        },
      },
      { new: true }
    ).exec();
  }

  public async updateConsent(
    caseId: string,
    hospitalId: string,
    input: UpdateConsentInput
  ): Promise<ISurgeryCaseDocument | null> {
    const existingCase = await SurgeryCaseModel.findOne({
      _id: caseId,
      hospitalId,
    });

    if (!existingCase) return null;

    const current = existingCase.consent
      ? existingCase.consent.toObject()
      : {
          procedureConsent: false,
          anesthesiaConsent: false,
          bloodTransfusionConsent: false,
          highRiskConsent: false,
          additionalProcedureConsent: false,
          signedByPatient: false,
          currentVersion: 0,
          history: [],
        };

    const version = (current.currentVersion || 0) + 1;

    const consent = {
      ...current,
      ...input,
      currentVersion: version,
      signedAt: new Date(),
    };

    consent.history = [
      ...(current.history || []),
      {
        type: input.type || 'PROCEDURE',
        obtained: true,
        signedByPatient: input.signedByPatient,
        witnessName: input.witnessName,
        witnessId: input.witnessId
          ? new Types.ObjectId(input.witnessId)
          : undefined,
        digitalSignatureUrl: input.digitalSignatureUrl,
        version,
        signedAt: new Date(),
        notes: input.notes,
      },
    ];

    delete (consent as Record<string, unknown>).type;

    return SurgeryCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId },
      { $set: { consent } },
      { new: true }
    ).exec();
  }

  public async updateWHOChecklist(
    caseId: string,
    hospitalId: string,
    input: UpdateWHOChecklistInput,
    completedBy: string
  ): Promise<ISurgeryCaseDocument | null> {
    const existingCase = await SurgeryCaseModel.findOne({
      _id: caseId,
      hospitalId,
    });

    if (!existingCase) return null;

    const checklist = existingCase.whoChecklist.toObject();

    checklist[input.stage] = {
      ...checklist[input.stage],
      ...input.data,
      completed: true,
      completedAt: new Date(),
      completedBy: new Types.ObjectId(completedBy),
    };

    return SurgeryCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId },
      {
        $set: {
          whoChecklist: checklist,
        },
      },
      { new: true }
    ).exec();
  }

  public async addVitalsLog(
    caseId: string,
    hospitalId: string,
    input: AddVitalsLogInput
  ): Promise<ISurgeryCaseDocument | null> {
    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
        status: SurgeryStatus.IN_PROGRESS,
      },
      {
        $push: {
          vitalsTimeline: {
            ...input,
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    ).exec();
  }

  public async updateAnesthesia(
    caseId: string,
    hospitalId: string,
    input: UpdateAnesthesiaInput
  ): Promise<ISurgeryCaseDocument | null> {
    const existingCase = await SurgeryCaseModel.findOne({
      _id: caseId,
      hospitalId,
    });

    if (!existingCase) return null;

    const current = existingCase.anesthesiaRecord
      ? existingCase.anesthesiaRecord.toObject()
      : {};

    return SurgeryCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId },
      {
        $set: {
          anesthesiaRecord: {
            ...current,
            ...input,
          },
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
    const existingCase = await SurgeryCaseModel.findOne({
      _id: caseId,
      hospitalId,
    });

    if (!existingCase) return null;

    const currentDocs = existingCase.intraopDocs
      ? existingCase.intraopDocs.toObject()
      : {};

    const update: Record<string, unknown> = {
      intraopDocs: {
        ...currentDocs,
        ...input,
      },
    };

    if (input.consumablesUsed !== undefined) {
      update.consumablesUsed = input.consumablesUsed;
    }

    if (input.equipmentChecklist !== undefined) {
      update.equipmentChecklist = input.equipmentChecklist;
    }

    if (input.instrumentChecklist !== undefined) {
      update.instrumentChecklist = input.instrumentChecklist;
    }

    if (input.implantsUsed !== undefined) {
      update.implantsUsed = input.implantsUsed;
    }

    delete (update.intraopDocs as Record<string, unknown>)
      .consumablesUsed;

    delete (update.intraopDocs as Record<string, unknown>)
      .equipmentChecklist;

    delete (update.intraopDocs as Record<string, unknown>)
      .instrumentChecklist;

    return SurgeryCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId },
      { $set: update },
      { new: true }
    ).exec();
  }

  public async startSurgery(
    caseId: string,
    hospitalId: string
  ): Promise<ISurgeryCaseDocument | null> {
    const existingCase = await SurgeryCaseModel.findOne({
      _id: caseId,
      hospitalId,
    });

    if (!existingCase) return null;

    if (
      ![
        SurgeryStatus.SCHEDULED,
        SurgeryStatus.PRE_OP_PREPARATION,
      ].includes(existingCase.status)
    ) {
      throw new Error('This surgery cannot be started from its current status.');
    }

    const now = new Date();

    return SurgeryCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId },
      {
        $set: {
          status: SurgeryStatus.IN_PROGRESS,
          actualStartTime: now,
          'intraopDocs.procedureStartTime': now,
        },
      },
      { new: true }
    ).exec();
  }

  public async completeSurgery(
    caseId: string,
    hospitalId: string,
    input: CompleteSurgeryInput
  ): Promise<ISurgeryCaseDocument | null> {
    const existingCase = await SurgeryCaseModel.findOne({
      _id: caseId,
      hospitalId,
      status: SurgeryStatus.IN_PROGRESS,
    });

    if (!existingCase) return null;

    const now = new Date();

    const existingDocs = existingCase.intraopDocs
      ? existingCase.intraopDocs.toObject()
      : {};

    const intraopDocs = {
      ...existingDocs,
      ...(input.intraopDocs || {}),
      procedureEndTime: now,
      closureTime: input.intraopDocs?.closureTime || now,
    };

    const update: Record<string, unknown> = {
      status: SurgeryStatus.COMPLETED,
      actualEndTime: now,
      intraopDocs,
      postOpNotes: input.postOpNotes,
    };

    if (input.anesthesiaRecord) {
      update.anesthesiaRecord = {
        ...(existingCase.anesthesiaRecord?.toObject() || {}),
        ...input.anesthesiaRecord,
      };
    }

    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
        status: SurgeryStatus.IN_PROGRESS,
      },
      { $set: update },
      { new: true }
    ).exec();
  }

  public async cancelCase(
    caseId: string,
    hospitalId: string,
    cancellationReason: string
  ): Promise<ISurgeryCaseDocument | null> {
    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
        status: {
          $nin: [
            SurgeryStatus.COMPLETED,
            SurgeryStatus.CANCELLED,
          ],
        },
      },
      {
        $set: {
          status: SurgeryStatus.CANCELLED,
          cancellationReason,
        },
      },
      { new: true }
    ).exec();
  }

  public async postponeCase(
    caseId: string,
    hospitalId: string,
    postponementReason: string
  ): Promise<ISurgeryCaseDocument | null> {
    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
        status: {
          $in: [
            SurgeryStatus.SCHEDULED,
            SurgeryStatus.PRE_OP_PREPARATION,
          ],
        },
      },
      {
        $set: {
          status: SurgeryStatus.POSTPONED,
          postponementReason,
        },
      },
      { new: true }
    ).exec();
  }

  public async assignTeamMember(
    caseId: string,
    hospitalId: string,
    userId: string,
    role: SurgicalRole,
    credentialVerified = false
  ): Promise<ISurgeryCaseDocument | null> {
    const existingCase = await SurgeryCaseModel.findOne({
      _id: caseId,
      hospitalId,
    });

    if (!existingCase) return null;

    const alreadyAssigned = existingCase.surgicalTeam.some(
      (member) =>
        member.userId.toString() === userId &&
        member.role === role
    );

    if (alreadyAssigned) {
      throw new Error('This team member is already assigned.');
    }

    return SurgeryCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId },
      {
        $push: {
          surgicalTeam: {
            userId: new Types.ObjectId(userId),
            role,
            credentialVerified,
            available: true,
          },
        },
      },
      { new: true }
    ).exec();
  }

  public async getTheatreSchedule(
    hospitalId: string,
    theatreId: string,
    date: string
  ): Promise<ISurgeryCaseDocument[]> {
    const start = new Date(`${date}T00:00:00.000`);
    const end = new Date(`${date}T23:59:59.999`);

    return SurgeryCaseModel.find({
      hospitalId,
      theatreId,
      scheduledStartTime: {
        $gte: start,
        $lte: end,
      },
      status: {
        $nin: [
          SurgeryStatus.CANCELLED,
          SurgeryStatus.POSTPONED,
        ],
      },
    })
      .sort({
        scheduledStartTime: 1,
        priority: -1,
      })
      .populate('patientId', 'firstName lastName mrn')
      .populate('leadSurgeonId', 'firstName lastName role')
      .populate('surgicalTeam.userId', 'firstName lastName role')
      .exec();
  }

  public async getUtilization(
    hospitalId: string,
    theatreId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    scheduledMinutes: number;
    availableMinutes: number;
    utilizationPercentage: number;
  }> {
    const cases = await SurgeryCaseModel.find({
      hospitalId,
      theatreId,
      status: {
        $nin: [
          SurgeryStatus.CANCELLED,
          SurgeryStatus.POSTPONED,
        ],
      },
      scheduledStartTime: {
        $lt: endDate,
      },
      scheduledEndTime: {
        $gt: startDate,
      },
    });

    const scheduledMinutes = cases.reduce((total, item) => {
      const start = Math.max(
        item.scheduledStartTime.getTime(),
        startDate.getTime()
      );

      const end = Math.min(
        item.scheduledEndTime.getTime(),
        endDate.getTime()
      );

      return total + Math.max(0, Math.ceil((end - start) / 60000));
    }, 0);

    const availableMinutes = Math.max(
      0,
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / 60000
      )
    );

    return {
      scheduledMinutes,
      availableMinutes,
      utilizationPercentage:
        availableMinutes === 0
          ? 0
          : Number(
              ((scheduledMinutes / availableMinutes) * 100).toFixed(2)
            ),
    };
  }
}

export const surgeryService = new SurgeryService();
