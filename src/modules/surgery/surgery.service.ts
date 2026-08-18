import { Types } from 'mongoose';
import { SurgeryCaseModel } from './surgery.model.js';
import {
  CreateSurgeryCaseInput,
  GetSurgeryCasesQuery,
  ISurgeryCaseDocument,
  ISurgicalConsent,
  SurgeryStatus,
  UpdatePreOpInput,
  UpdateConsentInput,
  UpdateWHOChecklistInput,
  AddVitalsLogInput,
  UpdateIntraopInput,
  CompleteSurgeryInput,
  UpdateTeamInput,
  SurgicalRole,
  UpdateMedicationInput,
  AdministerMedicationInput,
  UpdateAnesthesiaInput,
  RecoveryInput,
  RescheduleSurgeryInput,
  UrgencyLevel,
  ConsentType,
} from './surgery.types.js';

const ACTIVE_STATUSES = [
  SurgeryStatus.SCHEDULED,
  SurgeryStatus.PRE_OP_PREPARATION,
  SurgeryStatus.READY_FOR_THEATRE,
  SurgeryStatus.IN_PROGRESS,
];

export class SurgeryService {
  private validateObjectId(id: string | undefined | null, field = 'ID'): string {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new Error(`Invalid ${field}.`);
    }

    return id;
  }

  private normalizeObjectId(value: unknown, field: string): string {
    if (!value || typeof value !== 'string') {
      throw new Error(`Invalid ${field}.`);
    }

    const normalized = value.trim();

    if (!Types.ObjectId.isValid(normalized)) {
      throw new Error(`Invalid ${field}.`);
    }

    return normalized;
  }

  private normalizeTeamMembers(
    team: Array<{ userId?: string | null; role: SurgicalRole | string; credentialVerified?: boolean; notes?: string }>
  ) {
    if (!team) return [];

    return team
      .filter((member) => member && member.userId)
      .map((member) => {
        const userId = this.normalizeObjectId(member.userId, 'surgical team member ID');

        return {
          userId: new Types.ObjectId(userId),
          role: member.role,
          credentialVerified: Boolean(member.credentialVerified),
          assignedAt: new Date(),
          notes: member.notes || '',
        };
      });
  }

  private async checkSchedulingConflicts(
    hospitalId: string,
    startTime: Date,
    endTime: Date,
    theatreId: string,
    surgicalTeam: { userId: string }[],
    excludeCaseId?: string
  ): Promise<void> {
    const baseFilter: Record<string, unknown> = {
      hospitalId,
      status: { $in: ACTIVE_STATUSES },
      scheduledStartTime: { $lt: endTime },
      scheduledEndTime: { $gt: startTime },
    };

    if (excludeCaseId) {
      baseFilter._id = { $ne: excludeCaseId };
    }

    const theatreConflict = await SurgeryCaseModel.findOne({
      ...baseFilter,
      theatreId,
    }).lean();

    if (theatreConflict) {
      throw new Error(
        `Operating Theatre ${theatreId} is already booked for this time slot.`
      );
    }

    if (!surgicalTeam.length) return;

    const teamIds = surgicalTeam
      .map((member) => member.userId)
      .filter(Boolean)
      .map((id) => new Types.ObjectId(id));

    const teamConflict = await SurgeryCaseModel.findOne({
      ...baseFilter,
      'surgicalTeam.userId': {
        $in: teamIds,
      },
    }).lean();

    if (teamConflict) {
      throw new Error(
        'One or more surgical team members are already assigned to another surgery during this time.'
      );
    }
  }

  private validateTimeRange(start: Date, end: Date): void {
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      throw new Error('Invalid surgery schedule date.');
    }

    if (start >= end) {
      throw new Error('Scheduled end time must be after scheduled start time.');
    }
  }

  private validateTeam(team: Array<{ userId: string; role: SurgicalRole | string; credentialVerified?: boolean }>): void {
    const users = new Set<string>();
    const roles = new Set<SurgicalRole>();

    for (const member of team) {
      if (!member?.userId || !Types.ObjectId.isValid(member.userId)) {
        throw new Error('Invalid surgical team member ID.');
      }

      if (users.has(member.userId)) {
        throw new Error('A surgical team member cannot be assigned twice.');
      }

      users.add(member.userId);

      if (
        member.role === SurgicalRole.PRIMARY_SURGEON &&
        roles.has(SurgicalRole.PRIMARY_SURGEON)
      ) {
        throw new Error('Only one primary surgeon can be assigned.');
      }

      roles.add(member.role as SurgicalRole);
    }
  }

  private async populateSurgeryCase(caseId: string, hospitalId: string): Promise<ISurgeryCaseDocument | null> {
    return SurgeryCaseModel.findOne({
      _id: caseId,
      hospitalId,
    })
      .populate('patientId', 'firstName lastName mrn gender dateOfBirth')
      .populate('leadSurgeonId', 'firstName lastName role')
      .populate('surgicalTeam.userId', 'firstName lastName role')
      .populate('preOpAssessment.clearedBy', 'firstName lastName role')
      .exec();
  }

  public async scheduleCase(
    hospitalId: string,
    createdBy: string,
    input: CreateSurgeryCaseInput
  ): Promise<ISurgeryCaseDocument> {
    const patientId = this.validateObjectId(input.patientId, 'patient ID');
    const leadSurgeonId = this.validateObjectId(input.leadSurgeonId, 'lead surgeon ID');

    const start = new Date(input.scheduledStartTime);
    const end = new Date(input.scheduledEndTime);

    this.validateTimeRange(start, end);

    const rawTeam = input.surgicalTeam || [];
    const normalizedTeam = this.normalizeTeamMembers(rawTeam);

    const teamPayload = [
      {
        userId: new Types.ObjectId(leadSurgeonId),
        role: SurgicalRole.PRIMARY_SURGEON,
        credentialVerified: true,
        assignedAt: new Date(),
        notes: '',
      },
      ...normalizedTeam.filter(
        (member) => member.userId.toString() !== leadSurgeonId
      ),
    ];

    this.validateTeam(
      teamPayload.map((member) => ({
        userId: member.userId.toString(),
        role: member.role as SurgicalRole,
        credentialVerified: member.credentialVerified,
      }))
    );

    await this.checkSchedulingConflicts(
      hospitalId,
      start,
      end,
      input.theatreId,
      [
        { userId: leadSurgeonId },
        ...normalizedTeam.map((member) => ({
          userId: member.userId.toString(),
        })),
      ]
    );

    const surgeryCase = await SurgeryCaseModel.create({
      hospitalId: new Types.ObjectId(hospitalId),
      patientId: new Types.ObjectId(patientId),
      leadSurgeonId: new Types.ObjectId(leadSurgeonId),
      theatreId: input.theatreId,
      procedureName: input.procedureName,
      icdCode: input.icdCode,
      urgency: input.urgency ?? UrgencyLevel.ELECTIVE,
      priority: input.priority ?? 0,
      status: SurgeryStatus.SCHEDULED,
      scheduledStartTime: start,
      scheduledEndTime: end,
      estimatedDurationMinutes:
        input.estimatedDurationMinutes ??
        Math.round((end.getTime() - start.getTime()) / 60000),
      anesthesiaType: input.anesthesiaType,
      surgicalTeam: teamPayload,
      createdBy: new Types.ObjectId(createdBy),
      updatedBy: new Types.ObjectId(createdBy),
    });

    return surgeryCase;
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
    if (query.theatreId) filter.theatreId = query.theatreId;

    if (query.leadSurgeonId) {
      this.validateObjectId(query.leadSurgeonId, 'lead surgeon ID');
      filter.leadSurgeonId = query.leadSurgeonId;
    }

    if (query.patientId) {
      this.validateObjectId(query.patientId, 'patient ID');
      filter.patientId = query.patientId;
    }

    if (query.date) {
      const startOfDay = new Date(`${query.date}T00:00:00`);
      const endOfDay = new Date(`${query.date}T23:59:59.999`);

      filter.scheduledStartTime = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }

    const [cases, total] = await Promise.all([
      SurgeryCaseModel.find(filter)
        .populate('patientId', 'firstName lastName mrn gender dateOfBirth')
        .populate('leadSurgeonId', 'firstName lastName role')
        .populate('surgicalTeam.userId', 'firstName lastName role')
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
    this.validateObjectId(caseId, 'surgery case ID');

    return SurgeryCaseModel.findOne({
      _id: caseId,
      hospitalId,
    })
      .populate('patientId', 'firstName lastName mrn gender dateOfBirth')
      .populate('leadSurgeonId', 'firstName lastName role')
      .populate('surgicalTeam.userId', 'firstName lastName role')
      .populate('preOpAssessment.clearedBy', 'firstName lastName role')
      .exec();
  }

  public async updatePreOpAssessment(
    caseId: string,
    hospitalId: string,
    updatedBy: string,
    input: UpdatePreOpInput
  ): Promise<ISurgeryCaseDocument | null> {
    this.validateObjectId(caseId, 'surgery case ID');

    const existingCase = await SurgeryCaseModel.findOne({
      _id: caseId,
      hospitalId,
    });

    if (!existingCase) return null;

    const current =
      existingCase.preOpAssessment?.toObject?.() ||
      existingCase.preOpAssessment ||
      {};

    const preOp = {
      ...current,
      ...input,
      preOpVitals: {
        ...(current.preOpVitals || {}),
        ...(input.preOpVitals || {}),
      },
    };

    if (input.clearedForSurgery === true) {
      preOp.clearedAt = new Date();
      preOp.clearedBy = new Types.ObjectId(updatedBy);
    }

    await SurgeryCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId },
      {
        $set: {
          preOpAssessment: preOp,
          status:
            input.clearedForSurgery === true
              ? SurgeryStatus.READY_FOR_THEATRE
              : SurgeryStatus.PRE_OP_PREPARATION,
          updatedBy: new Types.ObjectId(updatedBy),
        },
      },
      { new: true }
    ).exec();

    return this.populateSurgeryCase(caseId, hospitalId);
  }

  public async updateConsent(
    caseId: string,
    hospitalId: string,
    recordedBy: string,
    input: UpdateConsentInput
  ): Promise<ISurgeryCaseDocument | null> {
    const existingCase = await SurgeryCaseModel.findOne({
      _id: caseId,
      hospitalId,
    });

    if (!existingCase) return null;

    const current: Partial<ISurgicalConsent> =
      (existingCase.consent?.toObject?.() ||
      existingCase.consent) as ISurgicalConsent || {};

    const versions = current.versions || [];

    const version =
      versions.length > 0
        ? versions[versions.length - 1].version + 1
        : 1;

    const consentType = input.type || ConsentType.PROCEDURE;

    let consented = false;

    switch (consentType) {
      case ConsentType.PROCEDURE:
        consented = input.procedureConsent ?? false;
        break;
      case ConsentType.ANESTHESIA:
        consented = input.anesthesiaConsent ?? false;
        break;
      case ConsentType.BLOOD_TRANSFUSION:
        consented = input.bloodTransfusionConsent ?? false;
        break;
      case ConsentType.HIGH_RISK:
        consented = input.highRiskConsent ?? false;
        break;
      case ConsentType.ADDITIONAL_PROCEDURE:
        consented = input.additionalProcedureConsent ?? false;
        break;
    }

    const newVersion = {
      version,
      type: consentType,
      consented,
      signedByPatient: input.signedByPatient ?? false,
      witnessName: input.witnessName,
      witnessId: input.witnessId
        ? new Types.ObjectId(input.witnessId)
        : undefined,
      digitalSignatureUrl: input.digitalSignatureUrl,
      signedAt: new Date(),
      recordedBy: new Types.ObjectId(recordedBy),
      notes: input.notes,
    };

    const consent: ISurgicalConsent = {
      procedureConsent:
        input.procedureConsent ?? current.procedureConsent ?? false,
      anesthesiaConsent:
        input.anesthesiaConsent ?? current.anesthesiaConsent ?? false,
      bloodTransfusionConsent:
        input.bloodTransfusionConsent ??
        current.bloodTransfusionConsent ??
        false,
      highRiskConsent:
        input.highRiskConsent ?? current.highRiskConsent ?? false,
      additionalProcedureConsent:
        input.additionalProcedureConsent ??
        current.additionalProcedureConsent ??
        false,
      signedByPatient:
        input.signedByPatient ?? current.signedByPatient ?? false,
      witnessName: input.witnessName ?? current.witnessName,
      witnessId: input.witnessId
        ? new Types.ObjectId(input.witnessId)
        : current.witnessId,
      digitalSignatureUrl:
        input.digitalSignatureUrl ?? current.digitalSignatureUrl,
      signedAt: new Date(),
      versions: [...versions, newVersion],
    };

    return SurgeryCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId },
      {
        $set: {
          consent,
          updatedBy: new Types.ObjectId(recordedBy),
        },
      },
      { new: true }
    ).exec();

    return this.populateSurgeryCase(caseId, hospitalId);
  }

  public async updateTeam(
    caseId: string,
    hospitalId: string,
    updatedBy: string,
    input: UpdateTeamInput
  ): Promise<ISurgeryCaseDocument | null> {
    const cleanTeam = input.surgicalTeam
      .filter((member) => member && member.userId)
      .map((member) => ({
        ...member,
        userId: this.normalizeObjectId(member.userId, 'surgical team member ID'),
      }));

    if (!cleanTeam.length) {
      throw new Error('At least one surgical team member is required.');
    }

    this.validateTeam(
      cleanTeam.map((member) => ({
        userId: member.userId,
        role: member.role,
        credentialVerified: member.credentialVerified,
      }))
    );

    const existingCase = await SurgeryCaseModel.findOne({
      _id: caseId,
      hospitalId,
    });

    if (!existingCase) return null;

    const leadSurgeonExists = cleanTeam.some(
      (member) =>
        member.role === SurgicalRole.PRIMARY_SURGEON &&
        member.userId === existingCase.leadSurgeonId.toString()
    );

    if (!leadSurgeonExists) {
      throw new Error(
        'The lead surgeon must be included as the primary surgeon.'
      );
    }

    await this.checkSchedulingConflicts(
      hospitalId,
      existingCase.scheduledStartTime,
      existingCase.scheduledEndTime,
      existingCase.theatreId,
      cleanTeam.map((member) => ({
        userId: member.userId,
      })),
      caseId
    );

    const surgicalTeam = cleanTeam.map((member) => ({
      userId: new Types.ObjectId(member.userId),
      role: member.role,
      credentialVerified: member.credentialVerified ?? false,
      assignedAt: new Date(),
      notes: member.notes,
    }));

    await SurgeryCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId },
      {
        $set: {
          surgicalTeam,
          updatedBy: new Types.ObjectId(updatedBy),
        },
      },
      { new: true }
    ).exec();

    return this.populateSurgeryCase(caseId, hospitalId);
  }

  public async rescheduleCase(
    caseId: string,
    hospitalId: string,
    updatedBy: string,
    input: RescheduleSurgeryInput
  ): Promise<ISurgeryCaseDocument | null> {
    const existingCase = await SurgeryCaseModel.findOne({
      _id: caseId,
      hospitalId,
    });

    if (!existingCase) return null;

    if (
      [
        SurgeryStatus.IN_PROGRESS,
        SurgeryStatus.COMPLETED,
        SurgeryStatus.CANCELLED,
      ].includes(existingCase.status)
    ) {
      throw new Error(
        'This surgery cannot be rescheduled in its current status.'
      );
    }

    this.validateTimeRange(
      new Date(input.scheduledStartTime),
      new Date(input.scheduledEndTime)
    );

    const theatreId = input.theatreId || existingCase.theatreId;

    await this.checkSchedulingConflicts(
      hospitalId,
      new Date(input.scheduledStartTime),
      new Date(input.scheduledEndTime),
      theatreId,
      existingCase.surgicalTeam.map((member) => ({
        userId: member.userId.toString(),
      })),
      caseId
    );

    return SurgeryCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId },
      {
        $set: {
          scheduledStartTime: new Date(input.scheduledStartTime),
          scheduledEndTime: new Date(input.scheduledEndTime),
          theatreId,
          postponementReason: input.reason,
          status: SurgeryStatus.SCHEDULED,
          updatedBy: new Types.ObjectId(updatedBy),
        },
      },
      { new: true }
    ).exec();
  }

  public async updateMedication(
    caseId: string,
    hospitalId: string,
    input: UpdateMedicationInput
  ): Promise<ISurgeryCaseDocument | null> {
    return SurgeryCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId },
      {
        $push: {
          medications: {
            ...input,
            status: 'PLANNED',
          },
        },
      },
      { new: true }
    ).exec();
  }

  public async administerMedication(
    caseId: string,
    hospitalId: string,
    administeredBy: string,
    input: AdministerMedicationInput
  ): Promise<ISurgeryCaseDocument | null> {
    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
        'medications._id': input.medicationId,
      },
      {
        $set: {
          'medications.$.status': 'ADMINISTERED',
          'medications.$.administeredAt': new Date(),
          'medications.$.administeredBy':
            new Types.ObjectId(administeredBy),
          'medications.$.notes': input.notes,
        },
      },
      { new: true }
    ).exec();
  }

  public async updateWHOChecklist(
    caseId: string,
    hospitalId: string,
    completedBy: string,
    input: UpdateWHOChecklistInput
  ): Promise<ISurgeryCaseDocument | null> {
    const existingCase = await SurgeryCaseModel.findOne({
      _id: caseId,
      hospitalId,
    });

    if (!existingCase) return null;

    const checklist = existingCase.whoChecklist?.toObject?.() || existingCase.whoChecklist || {};

    const stageData = {
      ...(checklist[input.stage] || {}),
      ...input.data,
      completed: true,
      completedAt: new Date(),
      completedBy: new Types.ObjectId(completedBy),
    };

    checklist[input.stage] = stageData as never;

    return SurgeryCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId },
      {
        $set: {
          whoChecklist: checklist,
          updatedBy: new Types.ObjectId(completedBy),
        },
      },
      { new: true }
    ).exec();
  }

  public async addVitalsLog(
    caseId: string,
    hospitalId: string,
    updatedBy: string,
    input: AddVitalsLogInput
  ): Promise<ISurgeryCaseDocument | null> {
    const vitals = {
      ...input,
      timestamp: input.timestamp
        ? new Date(input.timestamp)
        : new Date(),
    };

    return SurgeryCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId },
      {
        $push: {
          vitalsTimeline: vitals,
        },
        $set: {
          updatedBy: new Types.ObjectId(updatedBy),
        },
      },
      { new: true }
    ).exec();
  }

  public async startSurgery(
    caseId: string,
    hospitalId: string,
    updatedBy: string
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
        SurgeryStatus.READY_FOR_THEATRE,
      ].includes(existingCase.status)
    ) {
      throw new Error('This surgery cannot be started in its current status.');
    }

    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
        status: {
          $in: [
            SurgeryStatus.SCHEDULED,
            SurgeryStatus.PRE_OP_PREPARATION,
            SurgeryStatus.READY_FOR_THEATRE,
          ],
        },
      },
      {
        $set: {
          status: SurgeryStatus.IN_PROGRESS,
          actualStartTime: new Date(),
          'intraopDocs.procedureStartTime': new Date(),
          updatedBy: new Types.ObjectId(updatedBy),
        },
      },
      { new: true }
    ).exec();
  }

  public async updateIntraopDocs(
    caseId: string,
    hospitalId: string,
    updatedBy: string,
    input: UpdateIntraopInput
  ): Promise<ISurgeryCaseDocument | null> {
    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
        status: SurgeryStatus.IN_PROGRESS,
      },
      {
        $set: {
          intraopDocs: input,
          updatedBy: new Types.ObjectId(updatedBy),
        },
      },
      {
        new: true,
      }
    ).exec();
  }

  public async updateAnesthesia(
    caseId: string,
    hospitalId: string,
    updatedBy: string,
    input: UpdateAnesthesiaInput
  ): Promise<ISurgeryCaseDocument | null> {
    const drugs = input.drugs?.map((drug) => ({
      ...drug,
      administeredAt: drug.administeredAt
        ? new Date(drug.administeredAt)
        : new Date(),
      administeredBy: new Types.ObjectId(updatedBy),
    }));

    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
      },
      {
        $set: {
          anesthesiaRecord: {
            ...input,
            drugs,
          },
          updatedBy: new Types.ObjectId(updatedBy),
        },
      },
      { new: true }
    ).exec();
  }

  public async completeSurgery(
    caseId: string,
    hospitalId: string,
    updatedBy: string,
    input: CompleteSurgeryInput
  ): Promise<ISurgeryCaseDocument | null> {
    const existingCase = await SurgeryCaseModel.findOne({
      _id: caseId,
      hospitalId,
      status: SurgeryStatus.IN_PROGRESS,
    });

    if (!existingCase) return null;

    const now = new Date();

    const currentDocs =
      existingCase.intraopDocs?.toObject?.() ||
      existingCase.intraopDocs ||
      {};

    const intraopDocs = {
      ...currentDocs,
      ...(input.intraopDocs || {}),
      procedureEndTime: now,
      closureTime:
        input.intraopDocs?.closureTime || now,
    };

    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
        status: SurgeryStatus.IN_PROGRESS,
      },
      {
        $set: {
          status: SurgeryStatus.RECOVERY,
          actualEndTime: now,
          intraopDocs,
          postOpNotes: input.postOpNotes,
          updatedBy: new Types.ObjectId(updatedBy),
        },
      },
      { new: true }
    ).exec();
  }

  public async updateRecovery(
    caseId: string,
    hospitalId: string,
    assessedBy: string,
    input: RecoveryInput
  ): Promise<ISurgeryCaseDocument | null> {
    const existingCase = await SurgeryCaseModel.findOne({
      _id: caseId,
      hospitalId,
      status: SurgeryStatus.RECOVERY,
    });

    if (!existingCase) return null;

    const recoveryAssessment = {
      ...input,
      arrivalTime:
        existingCase.recoveryAssessment?.arrivalTime ||
        new Date(),
      assessedBy: new Types.ObjectId(assessedBy),
    };

    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
        status: SurgeryStatus.RECOVERY,
      },
      {
        $set: {
          recoveryAssessment,
          status: input.dischargeCriteriaMet
            ? SurgeryStatus.COMPLETED
            : SurgeryStatus.RECOVERY,
          updatedBy: new Types.ObjectId(assessedBy),
        },
      },
      { new: true }
    ).exec();
  }

  public async cancelCase(
    caseId: string,
    hospitalId: string,
    updatedBy: string,
    cancellationReason: string
  ): Promise<ISurgeryCaseDocument | null> {
    const existingCase = await SurgeryCaseModel.findOne({
      _id: caseId,
      hospitalId,
    });

    if (!existingCase) return null;

    if (
      [
        SurgeryStatus.COMPLETED,
        SurgeryStatus.CANCELLED,
      ].includes(existingCase.status)
    ) {
      throw new Error('This surgery can no longer be cancelled.');
    }

    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
      },
      {
        $set: {
          status: SurgeryStatus.CANCELLED,
          cancellationReason,
          updatedBy: new Types.ObjectId(updatedBy),
        },
      },
      { new: true }
    ).exec();
  }

  public async postponeCase(
    caseId: string,
    hospitalId: string,
    updatedBy: string,
    reason: string
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
          status: SurgeryStatus.POSTPONED,
          postponementReason: reason,
          updatedBy: new Types.ObjectId(updatedBy),
        },
      },
      { new: true }
    ).exec();
  }

  public async insertEmergencyCase(
    hospitalId: string,
    createdBy: string,
    input: CreateSurgeryCaseInput
  ): Promise<ISurgeryCaseDocument> {
    return this.scheduleCase(hospitalId, createdBy, {
      ...input,
      urgency: UrgencyLevel.EMERGENCY,
      priority: input.priority ?? 100,
    });
  }
}

export const surgeryService = new SurgeryService();
