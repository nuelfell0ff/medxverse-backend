import { Types } from 'mongoose';

import { SurgeryCaseModel } from './surgery.model.js';

import {
  AddMedicationInput,
  AddVitalsLogInput,
  CompleteSurgeryInput,
  CreateSurgeryCaseInput,
  GetSurgeryCasesQuery,
  ISurgeryCaseDocument,
  MedicationTiming,
  RescheduleSurgeryInput,
  SurgeryPriority,
  SurgeryStatus,
  SurgicalRole,
  UpdateAnesthesiaInput,
  UpdateConsentInput,
  UpdateIntraopInput,
  UpdatePreOpInput,
  UpdateRecoveryInput,
  UpdateWHOChecklistInput,
} from './surgery.types.js';

export class SurgeryService {
  /**
   * ============================================================
   * INTERNAL HELPERS
   * ============================================================
   */

  private validateObjectId(
    value: string,
    fieldName: string
  ): void {
    if (!Types.ObjectId.isValid(value)) {
      throw new Error(`Invalid ${fieldName}.`);
    }
  }

  private validateScheduleTimes(
    start: Date,
    end: Date
  ): void {
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      throw new Error(
        'Invalid scheduled start or end time.'
      );
    }

    if (end <= start) {
      throw new Error(
        'Scheduled end time must be after scheduled start time.'
      );
    }

    if (start < new Date()) {
      throw new Error(
        'Scheduled start time cannot be in the past.'
      );
    }
  }

  private async checkTheatreConflict(
    hospitalId: string,
    theatreId: string,
    start: Date,
    end: Date,
    excludeCaseId?: string
  ): Promise<void> {
    const query: Record<string, unknown> = {
      hospitalId,
      theatreId,

      status: {
        $in: [
          SurgeryStatus.SCHEDULED,
          SurgeryStatus.PRE_OP_PREPARATION,
          SurgeryStatus.READY_FOR_SURGERY,
          SurgeryStatus.IN_PROGRESS,
          SurgeryStatus.RECOVERY,
        ],
      },

      scheduledStartTime: {
        $lt: end,
      },

      scheduledEndTime: {
        $gt: start,
      },
    };

    if (
      excludeCaseId &&
      Types.ObjectId.isValid(excludeCaseId)
    ) {
      query._id = {
        $ne: excludeCaseId,
      };
    }

    const conflict =
      await SurgeryCaseModel.findOne(query);

    if (conflict) {
      throw new Error(
        `Operating Theatre ${theatreId} is already booked during this time period.`
      );
    }
  }

  private validateSurgicalTeam(
    surgicalTeam: CreateSurgeryCaseInput['surgicalTeam']
  ): void {
    if (!surgicalTeam?.length) {
      return;
    }

    const users = new Set<string>();

    for (const member of surgicalTeam) {
      if (!Types.ObjectId.isValid(member.userId)) {
        throw new Error(
          `Invalid surgical team member ID: ${member.userId}`
        );
      }

      if (users.has(member.userId)) {
        throw new Error(
          'A surgical team member cannot be assigned more than once.'
        );
      }

      users.add(member.userId);
    }

    const primarySurgeons =
      surgicalTeam.filter(
        (member) =>
          member.role === SurgicalRole.PRIMARY_SURGEON
      );

    if (primarySurgeons.length > 1) {
      throw new Error(
        'Only one primary surgeon can be assigned to a surgical case.'
      );
    }
  }

  /**
   * ============================================================
   * SCHEDULE SURGERY
   * ============================================================
   */

  public async scheduleCase(
    input: CreateSurgeryCaseInput
  ): Promise<ISurgeryCaseDocument> {
    this.validateObjectId(
      input.hospitalId,
      'hospital ID'
    );

    this.validateObjectId(
      input.patientId,
      'patient ID'
    );

    this.validateObjectId(
      input.leadSurgeonId,
      'lead surgeon ID'
    );

    if (!input.theatreId?.trim()) {
      throw new Error(
        'Operating theatre is required.'
      );
    }

    if (!input.procedureName?.trim()) {
      throw new Error(
        'Procedure name is required.'
      );
    }

    this.validateScheduleTimes(
      input.scheduledStartTime,
      input.scheduledEndTime
    );

    this.validateSurgicalTeam(
      input.surgicalTeam
    );

    await this.checkTheatreConflict(
      input.hospitalId,
      input.theatreId,
      input.scheduledStartTime,
      input.scheduledEndTime
    );

    const surgicalTeam =
      (input.surgicalTeam || []).map((member) => ({
        userId: new Types.ObjectId(member.userId),
        role: member.role,
        credentialVerified:
          member.credentialVerified ?? false,
        assignedAt: new Date(),
        notes: member.notes,
      }));

    const duration =
      input.estimatedDurationMinutes ||
      Math.round(
        (input.scheduledEndTime.getTime() -
          input.scheduledStartTime.getTime()) /
          60000
      );

    const surgeryCase =
      await SurgeryCaseModel.create({
        hospitalId: new Types.ObjectId(
          input.hospitalId
        ),

        patientId: new Types.ObjectId(
          input.patientId
        ),

        leadSurgeonId: new Types.ObjectId(
          input.leadSurgeonId
        ),

        theatreId: input.theatreId.trim(),

        procedureName:
          input.procedureName.trim(),

        icdCode: input.icdCode?.trim(),

        urgency:
          input.urgency ?? 'ELECTIVE',

        priority:
          input.priority ??
          SurgeryPriority.ROUTINE,

        status: SurgeryStatus.SCHEDULED,

        scheduledStartTime:
          input.scheduledStartTime,

        scheduledEndTime:
          input.scheduledEndTime,

        estimatedDurationMinutes: duration,

        anesthesiaType:
          input.anesthesiaType,

        surgicalTeam,
      });

    return surgeryCase;
  }

  /**
   * ============================================================
   * GET CASES
   * ============================================================
   */

  public async getCases(
    hospitalId: string,
    query: GetSurgeryCasesQuery
  ): Promise<{
    cases: ISurgeryCaseDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(
      1,
      query.page || 1
    );

    const limit = Math.min(
      50,
      Math.max(1, query.limit || 20)
    );

    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      hospitalId,
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.urgency) {
      filter.urgency = query.urgency;
    }

    if (query.priority) {
      filter.priority = query.priority;
    }

    if (query.theatreId) {
      filter.theatreId = query.theatreId;
    }

    if (query.leadSurgeonId) {
      filter.leadSurgeonId =
        query.leadSurgeonId;
    }

    if (query.patientId) {
      filter.patientId = query.patientId;
    }

    if (query.date) {
      const startOfDay = new Date(
        `${query.date}T00:00:00`
      );

      const endOfDay = new Date(
        `${query.date}T23:59:59.999`
      );

      filter.scheduledStartTime = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }

    if (query.fromDate || query.toDate) {
      const dateFilter: Record<string, Date> = {};

      if (query.fromDate) {
        dateFilter.$gte =
          new Date(query.fromDate);
      }

      if (query.toDate) {
        dateFilter.$lte =
          new Date(query.toDate);
      }

      filter.scheduledStartTime =
        dateFilter;
    }

    const [cases, total] =
      await Promise.all([
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
          })
          .skip(skip)
          .limit(limit)
          .exec(),

        SurgeryCaseModel.countDocuments(
          filter
        ),
      ]);

    return {
      cases,
      total,
      page,
      totalPages: Math.ceil(
        total / limit
      ),
    };
  }

  /**
   * ============================================================
   * GET CASE
   * ============================================================
   */

  public async getCaseById(
    caseId: string,
    hospitalId: string
  ): Promise<ISurgeryCaseDocument | null> {
    this.validateObjectId(
      caseId,
      'surgery case ID'
    );

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
      .populate(
        'preOpAssessment.clearedBy',
        'firstName lastName role'
      )
      .exec();
  }

  /**
   * ============================================================
   * PRE-OP ASSESSMENT
   * ============================================================
   */

  public async updatePreOpAssessment(
    caseId: string,
    hospitalId: string,
    input: UpdatePreOpInput
  ): Promise<ISurgeryCaseDocument | null> {
    const existingCase =
      await SurgeryCaseModel.findOne({
        _id: caseId,
        hospitalId,
      });

    if (!existingCase) {
      return null;
    }

    const existing =
      existingCase.preOpAssessment
        ? (
            existingCase.preOpAssessment as any
          ).toObject?.() ||
          existingCase.preOpAssessment
        : {};

    const updated = {
      ...existing,
      ...input,

      preOpVitals: {
        ...(existing.preOpVitals || {}),
        ...(input.preOpVitals || {}),
      },

      optimizationChecklist: {
        ...(existing.optimizationChecklist ||
          {}),
        ...(input.optimizationChecklist ||
          {}),
      },
    };

    if (input.clearedForSurgery) {
      updated.clearedAt = new Date();
      updated.clearedBy =
        existingCase.updatedBy;
    }

    const updatedCase =
      await SurgeryCaseModel.findOneAndUpdate(
        {
          _id: caseId,
          hospitalId,
        },
        {
          $set: {
            preOpAssessment: updated,
            status:
              input.clearedForSurgery
                ? SurgeryStatus.READY_FOR_SURGERY
                : SurgeryStatus.PRE_OP_PREPARATION,
          },
        },
        {
          new: true,
        }
      ).exec();

    return updatedCase;
  }

  /**
   * ============================================================
   * CONSENT
   * ============================================================
   */

  public async updateConsent(
    caseId: string,
    hospitalId: string,
    input: UpdateConsentInput,
    recordedBy: string
  ): Promise<ISurgeryCaseDocument | null> {
    this.validateObjectId(
      recordedBy,
      'recorded by ID'
    );

    const existingCase =
      await SurgeryCaseModel.findOne({
        _id: caseId,
        hospitalId,
      });

    if (!existingCase) {
      return null;
    }

    const previousVersion =
      existingCase.consent
        ?.currentVersion || 0;

    const newVersion =
      previousVersion + 1;

    const signedAt =
      input.signedByPatient
        ? new Date()
        : undefined;

    const version = {
      version: newVersion,

      procedureConsent:
        input.procedureConsent,

      anesthesiaConsent:
        input.anesthesiaConsent,

      bloodTransfusionConsent:
        input.bloodTransfusionConsent,

      highRiskConsent:
        input.highRiskConsent ?? false,

      additionalProcedureConsent:
        input.additionalProcedureConsent ??
        false,

      signedByPatient:
        input.signedByPatient,

      patientSignatureUrl:
        input.patientSignatureUrl,

      witnessName:
        input.witnessName,

      witnessSignatureUrl:
        input.witnessSignatureUrl,

      signedAt,

      recordedBy:
        new Types.ObjectId(recordedBy),

      notes: input.notes,
    };

    const updated =
      await SurgeryCaseModel.findOneAndUpdate(
        {
          _id: caseId,
          hospitalId,
        },
        {
          $set: {
            consent: {
              ...input,
              highRiskConsent:
                input.highRiskConsent ??
                false,

              additionalProcedureConsent:
                input.additionalProcedureConsent ??
                false,

              signedAt,

              currentVersion:
                newVersion,

              versionHistory: [
                ...(existingCase.consent
                  ?.versionHistory || []),
                version,
              ],
            },
          },
        },
        {
          new: true,
        }
      ).exec();

    return updated;
  }

  /**
   * ============================================================
   * WHO CHECKLIST
   * ============================================================
   */

  public async updateWHOChecklist(
    caseId: string,
    hospitalId: string,
    input: UpdateWHOChecklistInput
  ): Promise<ISurgeryCaseDocument | null> {
    const existingCase =
      await SurgeryCaseModel.findOne({
        _id: caseId,
        hospitalId,
      });

    if (!existingCase) {
      return null;
    }

    if (
      ![
        'signIn',
        'timeOut',
        'signOut',
      ].includes(input.stage)
    ) {
      throw new Error(
        'Invalid WHO checklist stage.'
      );
    }

    const stageData = {
      ...input.data,

      completed: true,

      completedAt: new Date(),

      completedBy:
        new Types.ObjectId(
          input.completedBy
        ),
    };

    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
      },
      {
        $set: {
          [`whoChecklist.${input.stage}`]:
            stageData,
        },
      },
      {
        new: true,
      }
    ).exec();
  }

  /**
   * ============================================================
   * VITALS
   * ============================================================
   */

  public async addVitalsLog(
    caseId: string,
    hospitalId: string,
    input: AddVitalsLogInput
  ): Promise<ISurgeryCaseDocument | null> {
    const timestamp =
      input.timestamp
        ? new Date(input.timestamp)
        : new Date();

    if (
      Number.isNaN(timestamp.getTime())
    ) {
      throw new Error(
        'Invalid vitals timestamp.'
      );
    }

    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
      },
      {
        $push: {
          vitalsTimeline: {
            ...input,
            timestamp,
          },
        },
      },
      {
        new: true,
      }
    ).exec();
  }

  /**
   * ============================================================
   * START SURGERY
   * ============================================================
   */

  public async startSurgery(
    caseId: string,
    hospitalId: string
  ): Promise<ISurgeryCaseDocument | null> {
    const existingCase =
      await SurgeryCaseModel.findOne({
        _id: caseId,
        hospitalId,
      });

    if (!existingCase) {
      return null;
    }

    if (
      ![
        SurgeryStatus.SCHEDULED,
        SurgeryStatus.PRE_OP_PREPARATION,
        SurgeryStatus.READY_FOR_SURGERY,
      ].includes(existingCase.status)
    ) {
      throw new Error(
        `Surgery cannot be started while case status is ${existingCase.status}.`
      );
    }

    if (
      !existingCase.preOpAssessment
        ?.clearedForSurgery
    ) {
      throw new Error(
        'Patient has not been cleared for surgery.'
      );
    }

    const consent =
      existingCase.consent;

    if (
      !consent?.procedureConsent ||
      !consent.anesthesiaConsent ||
      !consent.signedByPatient
    ) {
      throw new Error(
        'Required surgical consent has not been completed.'
      );
    }

    const now = new Date();

    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
      },
      {
        $set: {
          status:
            SurgeryStatus.IN_PROGRESS,

          actualStartTime: now,

          'intraopDocs.procedureStartTime':
            now,
        },
      },
      {
        new: true,
      }
    ).exec();
  }

  /**
   * ============================================================
   * INTRAOPERATIVE DOCUMENTATION
   * ============================================================
   */

  public async updateIntraopDocs(
    caseId: string,
    hospitalId: string,
    input: UpdateIntraopInput
  ): Promise<ISurgeryCaseDocument | null> {
    const existingCase =
      await SurgeryCaseModel.findOne({
        _id: caseId,
        hospitalId,
      });

    if (!existingCase) {
      return null;
    }

    const existingDocs =
      existingCase.intraopDocs
        ? (
            existingCase.intraopDocs as any
          ).toObject?.() ||
          existingCase.intraopDocs
        : {};

    const {
      consumablesUsed,
      equipmentChecklist,
      ...documentation
    } = input;

    const intraopDocs = {
      ...existingDocs,
      ...documentation,
    };

    const update: Record<string, any> = {
      $set: {
        intraopDocs,
      },
    };

    if (consumablesUsed) {
      update.$set.consumablesUsed =
        consumablesUsed;
    }

    if (equipmentChecklist) {
      update.$set.equipmentChecklist =
        equipmentChecklist;
    }

    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
      },
      update,
      {
        new: true,
      }
    ).exec();
  }

  /**
   * ============================================================
   * ANAESTHESIA RECORD
   * ============================================================
   */

  public async updateAnesthesiaRecord(
    caseId: string,
    hospitalId: string,
    input: UpdateAnesthesiaInput
  ): Promise<ISurgeryCaseDocument | null> {
    const existingCase =
      await SurgeryCaseModel.findOne({
        _id: caseId,
        hospitalId,
      });

    if (!existingCase) {
      return null;
    }

    const existing =
      existingCase.anesthesiaRecord
        ? (
            existingCase.anesthesiaRecord as any
          ).toObject?.() ||
          existingCase.anesthesiaRecord
        : {};

    const anesthesiaRecord = {
      ...existing,
      ...input,
    };

    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
      },
      {
        $set: {
          anesthesiaRecord,
        },
      },
      {
        new: true,
      }
    ).exec();
  }

  /**
   * ============================================================
   * MEDICATION
   * ============================================================
   */

  public async addMedication(
    caseId: string,
    hospitalId: string,
    input: AddMedicationInput,
    administeredBy?: string
  ): Promise<ISurgeryCaseDocument | null> {
    const medication = {
      ...input,

      administered:
        input.administered ?? false,

      administeredAt:
        input.administered
          ? input.administeredAt ||
            new Date()
          : undefined,

      administeredBy:
        input.administered &&
        administeredBy &&
        Types.ObjectId.isValid(
          administeredBy
        )
          ? new Types.ObjectId(
              administeredBy
            )
          : undefined,
    };

    const target =
      input.timing ===
      MedicationTiming.PRE_OPERATIVE
        ? 'preOpMedications'
        : 'intraOpMedications';

    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
      },
      {
        $push: {
          [target]: medication,
        },
      },
      {
        new: true,
      }
    ).exec();
  }

  /**
   * ============================================================
   * RECOVERY
   * ============================================================
   */

  public async updateRecovery(
    caseId: string,
    hospitalId: string,
    input: UpdateRecoveryInput
  ): Promise<ISurgeryCaseDocument | null> {
    const existingCase =
      await SurgeryCaseModel.findOne({
        _id: caseId,
        hospitalId,
      });

    if (!existingCase) {
      return null;
    }

    const existing =
      existingCase.recoveryAssessment
        ? (
            existingCase.recoveryAssessment as any
          ).toObject?.() ||
          existingCase.recoveryAssessment
        : {};

    const recoveryAssessment = {
      ...existing,
      ...input,
    };

    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
      },
      {
        $set: {
          recoveryAssessment,
          status:
            SurgeryStatus.RECOVERY,
        },
      },
      {
        new: true,
      }
    ).exec();
  }

  /**
   * ============================================================
   * COMPLETE SURGERY
   * ============================================================
   */

  public async completeSurgery(
    caseId: string,
    hospitalId: string,
    input: CompleteSurgeryInput
  ): Promise<ISurgeryCaseDocument | null> {
    const existingCase =
      await SurgeryCaseModel.findOne({
        _id: caseId,
        hospitalId,
      });

    if (!existingCase) {
      return null;
    }

    if (
      existingCase.status !==
      SurgeryStatus.IN_PROGRESS
    ) {
      throw new Error(
        'Only an in-progress surgery can be completed.'
      );
    }

    const who =
      existingCase.whoChecklist;

    if (!who.signOut.completed) {
      throw new Error(
        'WHO Sign Out checklist must be completed before surgery can be completed.'
      );
    }

    const now = new Date();

    const existingDocs =
      existingCase.intraopDocs
        ? (
            existingCase.intraopDocs as any
          ).toObject?.() ||
          existingCase.intraopDocs
        : {};

    const inputDocs =
      input.intraopDocs || {};

    const intraopDocs = {
      ...existingDocs,
      ...inputDocs,

      procedureEndTime:
        inputDocs.procedureEndTime ||
        now,

      closureTime:
        inputDocs.closureTime ||
        now,
    };

    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
        status: SurgeryStatus.IN_PROGRESS,
      },
      {
        $set: {
          status:
            SurgeryStatus.COMPLETED,

          actualEndTime: now,

          intraopDocs,

          anesthesiaRecord:
            input.anesthesiaRecord,

          postOpNotes:
            input.postOpNotes,

          recoveryAssessment:
            input.recoveryAssessment,
        },
      },
      {
        new: true,
      }
    ).exec();
  }

  /**
   * ============================================================
   * CANCEL
   * ============================================================
   */

  public async cancelCase(
    caseId: string,
    hospitalId: string,
    cancellationReason: string
  ): Promise<ISurgeryCaseDocument | null> {
    if (!cancellationReason?.trim()) {
      throw new Error(
        'Cancellation reason is required.'
      );
    }

    const existingCase =
      await SurgeryCaseModel.findOne({
        _id: caseId,
        hospitalId,
      });

    if (!existingCase) {
      return null;
    }

    if (
      [
        SurgeryStatus.COMPLETED,
        SurgeryStatus.IN_PROGRESS,
      ].includes(existingCase.status)
    ) {
      throw new Error(
        'This surgery cannot be cancelled in its current status.'
      );
    }

    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
      },
      {
        $set: {
          status:
            SurgeryStatus.CANCELLED,

          cancellationReason:
            cancellationReason.trim(),
        },
      },
      {
        new: true,
      }
    ).exec();
  }

  /**
   * ============================================================
   * RESCHEDULE
   * ============================================================
   */

  public async rescheduleCase(
    caseId: string,
    hospitalId: string,
    input: RescheduleSurgeryInput,
    rescheduledBy: string
  ): Promise<ISurgeryCaseDocument | null> {
    this.validateScheduleTimes(
      input.scheduledStartTime,
      input.scheduledEndTime
    );

    const existingCase =
      await SurgeryCaseModel.findOne({
        _id: caseId,
        hospitalId,
      });

    if (!existingCase) {
      return null;
    }

    if (
      [
        SurgeryStatus.COMPLETED,
        SurgeryStatus.CANCELLED,
        SurgeryStatus.IN_PROGRESS,
      ].includes(existingCase.status)
    ) {
      throw new Error(
        'This surgery cannot be rescheduled in its current status.'
      );
    }

    await this.checkTheatreConflict(
      hospitalId,
      existingCase.theatreId,
      input.scheduledStartTime,
      input.scheduledEndTime,
      caseId
    );

    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
      },
      {
        $set: {
          scheduledStartTime:
            input.scheduledStartTime,

          scheduledEndTime:
            input.scheduledEndTime,

          estimatedDurationMinutes:
            Math.round(
              (input.scheduledEndTime.getTime() -
                input.scheduledStartTime.getTime()) /
                60000
            ),

          status:
            SurgeryStatus.SCHEDULED,

          rescheduledFrom:
            existingCase.scheduledStartTime,

          rescheduledAt: new Date(),

          rescheduledBy:
            new Types.ObjectId(
              rescheduledBy
            ),

          postponedReason:
            input.reason,
        },
      },
      {
        new: true,
      }
    ).exec();
  }

  /**
   * ============================================================
   * POSTPONE
   * ============================================================
   */

  public async postponeCase(
    caseId: string,
    hospitalId: string,
    reason: string
  ): Promise<ISurgeryCaseDocument | null> {
    if (!reason?.trim()) {
      throw new Error(
        'Postponement reason is required.'
      );
    }

    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,

        status: {
          $in: [
            SurgeryStatus.SCHEDULED,
            SurgeryStatus.PRE_OP_PREPARATION,
            SurgeryStatus.READY_FOR_SURGERY,
          ],
        },
      },
      {
        $set: {
          status:
            SurgeryStatus.POSTPONED,

          postponedReason:
            reason.trim(),
        },
      },
      {
        new: true,
      }
    ).exec();
  }
}

export const surgeryService =
  new SurgeryService();
