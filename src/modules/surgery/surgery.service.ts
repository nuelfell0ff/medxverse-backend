import { createHash } from 'crypto';
import { Types, model } from 'mongoose';
import { Staff } from '../staff/staff.model.js';
import { createCharge, resolvePrice } from '../billing/billing.service.js';
import { PricingCatalogueModel } from '../billing/billing.model.js';
import { BillingSourceModule, ChargeCategory } from '../billing/billing.types.js';
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
  SurgeryBillingStatus,
  CaptureSurgeryBillingInput,
} from './surgery.types.js';

const ACTIVE_STATUSES = [
  SurgeryStatus.SCHEDULED,
  SurgeryStatus.PRE_OP_PREPARATION,
  SurgeryStatus.READY_FOR_THEATRE,
  SurgeryStatus.IN_PROGRESS,
];

export class SurgeryService {
  /**
   * Authentication records and hospital staff records are different things.
   *
   * Account:
   * - Authenticated application account / actor.
   *
   * Staff:
   * - Hospital-owned staff directory record.
   *
   * SurgicalRole:
   * - Assignment label inside a surgery case only.
   * - It is NOT used as an authorization layer.
   *
   * The hospital is the authorization boundary.
   */

  private getAccountModel() {
    return model('Account');
  }

  /**
   * Verify that the authenticated account belongs to the hospital.
   *
   * This is only used for the authenticated application actor.
   * It is NOT used for surgical team members.
   */
  private async assertHospitalMember(
    hospitalId: string,
    accountId: string,
    field = 'user ID'
  ): Promise<void> {
    this.validateObjectId(hospitalId, 'hospital ID');
    this.validateObjectId(accountId, field);

    const account = await this.getAccountModel()
      .findOne({
        _id: accountId,
        hospitalId,
      })
      .select('_id')
      .lean();

    if (!account) {
      throw new Error(
        `The authenticated ${field} does not belong to this hospital.`
      );
    }
  }

  /**
   * Verify that a Staff record belongs to this hospital.
   *
   * IMPORTANT:
   * Surgery leadSurgeonId and surgicalTeam.userId contain
   * Staff document IDs, NOT Account IDs.
   *
   * Staff is hospital-owned data.
   *
   * We deliberately DO NOT check:
   * - Staff role
   * - Staff permission
   * - Staff authorization
   * - isActive
   * - status
   *
   * The only required relationship here is:
   *
   *     Staff._id -> Staff.hospitalId
   *
   * This also avoids relying on Staff fields that may not exist
   * in the Staff TypeScript model.
   */
  private async assertHospitalStaff(
    hospitalId: string,
    staffId: string,
    field = 'staff ID'
  ): Promise<void> {
    this.validateObjectId(hospitalId, 'hospital ID');
    this.validateObjectId(staffId, field);

    const staff = await Staff.findOne({
      _id: staffId,
      hospitalId,
    })
      .select('_id hospitalId')
      .lean();

    if (!staff) {
      throw new Error(
        `Referenced ${field} does not belong to this hospital.`
      );
    }
  }

  /**
   * Verify that a patient belongs to this hospital.
   */
  private async assertPatientBelongsToHospital(
    hospitalId: string,
    patientId: string
  ): Promise<void> {
    this.validateObjectId(hospitalId, 'hospital ID');
    this.validateObjectId(patientId, 'patient ID');

    const patient = await model('Patient')
      .findOne({
        _id: patientId,
        hospitalId,
      })
      .select('_id')
      .lean();

    if (!patient) {
      throw new Error('Patient does not belong to this hospital.');
    }
  }

  private validateObjectId(
    id: string | undefined | null,
    field = 'ID'
  ): string {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new Error(`Invalid ${field}.`);
    }

    return id;
  }

  private normalizeObjectId(
    value: unknown,
    field: string
  ): string {
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
    team: Array<{
      userId?: string | null;
      role: SurgicalRole | string;
      credentialVerified?: boolean;
      notes?: string;
    }>
  ) {
    if (!team) return [];

    return team
      .filter((member) => member && member.userId)
      .map((member) => {
        const userId = this.normalizeObjectId(
          member.userId,
          'surgical team member ID'
        );

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
      status: {
        $in: ACTIVE_STATUSES,
      },
      scheduledStartTime: {
        $lt: endTime,
      },
      scheduledEndTime: {
        $gt: startTime,
      },
    };

    if (excludeCaseId) {
      baseFilter._id = {
        $ne: excludeCaseId,
      };
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

  private validateTimeRange(
    start: Date,
    end: Date
  ): void {
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      throw new Error('Invalid surgery schedule date.');
    }

    if (start >= end) {
      throw new Error(
        'Scheduled end time must be after scheduled start time.'
      );
    }
  }

  private validateTeam(
    team: Array<{
      userId: string;
      role: SurgicalRole | string;
      credentialVerified?: boolean;
    }>
  ): void {
    const users = new Set<string>();
    const roles = new Set<SurgicalRole>();

    for (const member of team) {
      if (
        !member?.userId ||
        !Types.ObjectId.isValid(member.userId)
      ) {
        throw new Error(
          'Invalid surgical team member ID.'
        );
      }

      if (users.has(member.userId)) {
        throw new Error(
          'A surgical team member cannot be assigned twice.'
        );
      }

      users.add(member.userId);

      if (
        member.role === SurgicalRole.PRIMARY_SURGEON &&
        roles.has(SurgicalRole.PRIMARY_SURGEON)
      ) {
        throw new Error(
          'Only one primary surgeon can be assigned.'
        );
      }

      roles.add(member.role as SurgicalRole);
    }
  }

  private billingProcedureCode(procedureName: string): string {
    return `SURGERY_${this.billingCode(procedureName)}`;
  }

  private async getSelectedSurgeryCatalogue(
    hospitalId: string,
    catalogueItemId: string,
    procedureCode: string,
    serviceDate: Date
  ) {
    this.validateObjectId(catalogueItemId, 'pricing catalogue item ID');

    const catalogue = await PricingCatalogueModel.findOne({
      _id: new Types.ObjectId(catalogueItemId),
      hospitalId: new Types.ObjectId(hospitalId),
      isActive: true,
      code: procedureCode,
      departmentName: { $regex: '^Surgery$', $options: 'i' },
      $or: [
        { effectiveFrom: { $exists: false } },
        { effectiveFrom: null },
        { effectiveFrom: { $lte: serviceDate } },
      ],
      $and: [
        {
          $or: [
            { effectiveTo: { $exists: false } },
            { effectiveTo: null },
            { effectiveTo: { $gt: serviceDate } },
          ],
        },
      ],
    }).lean();

    if (!catalogue) {
      throw new Error(
        'The selected Surgery pricing catalogue is not active, does not belong to this hospital/procedure, or is not effective for the scheduled date.'
      );
    }

    return catalogue;
  }

  public async getPricingCatalogues(
    hospitalId: string,
    procedureName?: string
  ) {
    this.validateObjectId(hospitalId, 'hospital ID');

    const filter: Record<string, unknown> = {
      hospitalId: new Types.ObjectId(hospitalId),
      departmentName: { $regex: '^Surgery$', $options: 'i' },
      isActive: true,
    };

    if (procedureName?.trim()) {
      filter.code = this.billingProcedureCode(procedureName);
    }

    return PricingCatalogueModel.find(filter)
      .select('code name planName category departmentId departmentName price currency version effectiveFrom effectiveTo description')
      .sort({ planName: 1, version: -1, effectiveFrom: -1 })
      .lean();
  }

  private async populateSurgeryCase(
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
        'firstName middleName lastName title role jobTitle professionalTitle'
      )
      .populate(
        'surgicalTeam.userId',
        'firstName middleName lastName title role jobTitle professionalTitle'
      )
      .populate(
        'preOpAssessment.clearedBy',
        'firstName lastName role'
      )
      .exec();
  }

  public async scheduleCase(
    hospitalId: string,
    createdBy: string,
    input: CreateSurgeryCaseInput
  ): Promise<ISurgeryCaseDocument> {
    await this.assertHospitalMember(
      hospitalId,
      createdBy,
      'creator ID'
    );

    const patientId = this.validateObjectId(
      input.patientId,
      'patient ID'
    );

    const leadSurgeonId = this.validateObjectId(
      input.leadSurgeonId,
      'lead surgeon ID'
    );

    await this.assertPatientBelongsToHospital(
      hospitalId,
      patientId
    );

    await this.assertHospitalStaff(
      hospitalId,
      leadSurgeonId,
      'lead surgeon ID'
    );

    const start = new Date(
      input.scheduledStartTime
    );

    const end = new Date(
      input.scheduledEndTime
    );

    this.validateTimeRange(start, end);

    const procedureCode = this.billingProcedureCode(input.procedureName);
    let selectedCatalogue: any = null;

    if (input.pricingCatalogueItemId) {
      selectedCatalogue = await this.getSelectedSurgeryCatalogue(
        hospitalId,
        input.pricingCatalogueItemId,
        procedureCode,
        start
      );
    } else {
      // If there is exactly one applicable Surgery plan, use it automatically.
      // If multiple plans exist, Billing's resolver will reject the ambiguity.
      const resolved = await resolvePrice({
        hospitalId,
        code: procedureCode,
        departmentName: 'Surgery',
        category: ChargeCategory.SURGERY,
        serviceDate: start,
      });
      selectedCatalogue = {
        _id: resolved.catalogueItemId,
        planName: (resolved as any).planName,
        price: resolved.price,
        version: resolved.version,
        currency: resolved.currency,
      };
    }

    const rawTeam = input.surgicalTeam || [];

    const normalizedTeam =
      this.normalizeTeamMembers(rawTeam);

    /**
     * Every surgical team member must belong to the same hospital.
     *
     * No staff role or permission check is performed.
     */
    for (const member of normalizedTeam) {
      await this.assertHospitalStaff(
        hospitalId,
        member.userId.toString(),
        'surgical team member ID'
      );
    }

    const teamPayload = [
      {
        userId: new Types.ObjectId(leadSurgeonId),
        role: SurgicalRole.PRIMARY_SURGEON,
        credentialVerified: true,
        assignedAt: new Date(),
        notes: '',
      },
      ...normalizedTeam.filter(
        (member) =>
          member.userId.toString() !== leadSurgeonId
      ),
    ];

    this.validateTeam(
      teamPayload.map((member) => ({
        userId: member.userId.toString(),
        role: member.role as SurgicalRole,
        credentialVerified:
          member.credentialVerified,
      }))
    );

    await this.checkSchedulingConflicts(
      hospitalId,
      start,
      end,
      input.theatreId,
      [
        {
          userId: leadSurgeonId,
        },
        ...normalizedTeam.map((member) => ({
          userId: member.userId.toString(),
        })),
      ]
    );

    const surgeryCase =
      await SurgeryCaseModel.create({
        hospitalId: new Types.ObjectId(hospitalId),

        patientId: new Types.ObjectId(patientId),

        leadSurgeonId:
          new Types.ObjectId(leadSurgeonId),

        theatreId: input.theatreId,

        procedureName: input.procedureName,

        pricingCatalogueItemId: selectedCatalogue?._id,
        pricingCataloguePlanName: selectedCatalogue?.planName,
        pricingCataloguePrice: selectedCatalogue?.price,
        pricingCatalogueVersion: selectedCatalogue?.version,
        pricingCatalogueCurrency: selectedCatalogue?.currency,

        icdCode: input.icdCode,

        urgency:
          input.urgency ??
          UrgencyLevel.ELECTIVE,

        priority:
          input.priority ?? 0,

        status:
          SurgeryStatus.SCHEDULED,

        scheduledStartTime: start,

        scheduledEndTime: end,

        estimatedDurationMinutes:
          input.estimatedDurationMinutes ??
          Math.round(
            (end.getTime() -
              start.getTime()) /
              60000
          ),

        anesthesiaType:
          input.anesthesiaType,

        surgicalTeam: teamPayload,

        createdBy:
          new Types.ObjectId(createdBy),

        updatedBy:
          new Types.ObjectId(createdBy),
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
    const page = Math.max(
      1,
      query.page || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, query.limit || 20)
    );

    const skip =
      (page - 1) * limit;

    const filter: Record<string, unknown> = {
      hospitalId,
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.urgency) {
      filter.urgency = query.urgency;
    }

    if (query.theatreId) {
      filter.theatreId =
        query.theatreId;
    }

    if (query.leadSurgeonId) {
      this.validateObjectId(
        query.leadSurgeonId,
        'lead surgeon ID'
      );

      filter.leadSurgeonId =
        query.leadSurgeonId;
    }

    if (query.patientId) {
      this.validateObjectId(
        query.patientId,
        'patient ID'
      );

      filter.patientId =
        query.patientId;
    }

    if (query.date) {
      const startOfDay =
        new Date(
          `${query.date}T00:00:00`
        );

      const endOfDay =
        new Date(
          `${query.date}T23:59:59.999`
        );

      filter.scheduledStartTime = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
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
            'firstName middleName lastName title role jobTitle professionalTitle'
          )
          .populate(
            'surgicalTeam.userId',
            'firstName middleName lastName title role jobTitle professionalTitle'
          )
          .sort({
            scheduledStartTime: 1,
            priority: -1,
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
        'firstName middleName lastName title role jobTitle professionalTitle'
      )
      .populate(
        'surgicalTeam.userId',
        'firstName middleName lastName title role jobTitle professionalTitle'
      )
      .populate(
        'preOpAssessment.clearedBy',
        'firstName lastName role'
      )
      .exec();
  }

  public async updatePreOpAssessment(
    caseId: string,
    hospitalId: string,
    updatedBy: string,
    input: UpdatePreOpInput
  ): Promise<ISurgeryCaseDocument | null> {
    await this.assertHospitalMember(
      hospitalId,
      updatedBy,
      'updater ID'
    );

    this.validateObjectId(
      caseId,
      'surgery case ID'
    );

    const existingCase =
      await SurgeryCaseModel.findOne({
        _id: caseId,
        hospitalId,
      });

    if (!existingCase) {
      return null;
    }

    const current =
      existingCase.preOpAssessment
        ?.toObject?.() ||
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
      // The current pre-op UI does not expose the internal optimization
      // checklist. Do not block an ordinary pre-op save because those
      // hidden fields are absent. If a caller explicitly supplies the
      // checklist, it is preserved and can still be used by downstream
      // workflows.
      preOp.clearedAt = new Date();
      preOp.clearedBy = new Types.ObjectId(updatedBy);
    } else if (input.clearedForSurgery === false) {
      preOp.clearedAt = undefined;
      preOp.clearedBy = undefined;
    }

    await SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
      },
      {
        $set: {
          preOpAssessment:
            preOp,

          status:
            input.clearedForSurgery === true
              ? SurgeryStatus.READY_FOR_THEATRE
              : SurgeryStatus.PRE_OP_PREPARATION,

          updatedBy:
            new Types.ObjectId(
              updatedBy
            ),
        },
      },
      {
        new: true,
      }
    ).exec();

    return this.populateSurgeryCase(
      caseId,
      hospitalId
    );
  }

  public async updateConsent(
    caseId: string,
    hospitalId: string,
    recordedBy: string,
    input: UpdateConsentInput
  ): Promise<ISurgeryCaseDocument | null> {
    await this.assertHospitalMember(
      hospitalId,
      recordedBy,
      'recording staff ID'
    );

    const existingCase =
      await SurgeryCaseModel.findOne({
        _id: caseId,
        hospitalId,
      });

    if (!existingCase) {
      return null;
    }

    const current: Partial<ISurgicalConsent> =
      (existingCase.consent
        ?.toObject?.() ||
        existingCase.consent) as
        | ISurgicalConsent
        | {};

    const versions =
      current.versions || [];

    const version =
      versions.length > 0
        ? versions[
            versions.length - 1
          ].version + 1
        : 1;

    const consentType =
      input.type ||
      ConsentType.PROCEDURE;

    let consented = false;

    switch (consentType) {
      case ConsentType.PROCEDURE:
        consented =
          input.procedureConsent ??
          false;
        break;

      case ConsentType.ANESTHESIA:
        consented =
          input.anesthesiaConsent ??
          false;
        break;

      case ConsentType.BLOOD_TRANSFUSION:
        consented =
          input.bloodTransfusionConsent ??
          false;
        break;

      case ConsentType.HIGH_RISK:
        consented =
          input.highRiskConsent ??
          false;
        break;

      case ConsentType.ADDITIONAL_PROCEDURE:
        consented =
          input.additionalProcedureConsent ??
          false;
        break;
    }

    const newVersion = {
      version,

      type: consentType,

      consented,

      signedByPatient:
        input.signedByPatient ??
        false,

      witnessName:
        input.witnessName,

      witnessId:
        input.witnessId
          ? new Types.ObjectId(
              input.witnessId
            )
          : undefined,

      digitalSignatureUrl:
        input.digitalSignatureUrl,

      signedAt: new Date(),

      recordedBy:
        new Types.ObjectId(
          recordedBy
        ),

      notes: input.notes,
    };

    const consent: ISurgicalConsent = {
      procedureConsent:
        input.procedureConsent ??
        current.procedureConsent ??
        false,

      anesthesiaConsent:
        input.anesthesiaConsent ??
        current.anesthesiaConsent ??
        false,

      bloodTransfusionConsent:
        input.bloodTransfusionConsent ??
        current.bloodTransfusionConsent ??
        false,

      highRiskConsent:
        input.highRiskConsent ??
        current.highRiskConsent ??
        false,

      additionalProcedureConsent:
        input.additionalProcedureConsent ??
        current.additionalProcedureConsent ??
        false,

      signedByPatient:
        input.signedByPatient ??
        current.signedByPatient ??
        false,

      witnessName:
        input.witnessName ??
        current.witnessName,

      witnessId:
        input.witnessId
          ? new Types.ObjectId(
              input.witnessId
            )
          : current.witnessId,

      digitalSignatureUrl:
        input.digitalSignatureUrl ??
        current.digitalSignatureUrl,

      signedAt: new Date(),

      versions: [
        ...versions,
        newVersion,
      ],
    };

    await SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
      },
      {
        $set: {
          consent,

          updatedBy:
            new Types.ObjectId(
              recordedBy
            ),
        },
      },
      {
        new: true,
      }
    ).exec();

    return this.populateSurgeryCase(
      caseId,
      hospitalId
    );
  }

  public async updateTeam(
    caseId: string,
    hospitalId: string,
    updatedBy: string,
    input: UpdateTeamInput
  ): Promise<ISurgeryCaseDocument | null> {
    await this.assertHospitalMember(
      hospitalId,
      updatedBy,
      'updater ID'
    );

    const cleanTeam =
      input.surgicalTeam
        .filter(
          (member) =>
            member &&
            member.userId
        )
        .map((member) => ({
          ...member,

          userId:
            this.normalizeObjectId(
              member.userId,
              'surgical team member ID'
            ),
        }));

    if (!cleanTeam.length) {
      throw new Error(
        'At least one surgical team member is required.'
      );
    }

    this.validateTeam(
      cleanTeam.map(
        (member) => ({
          userId:
            member.userId,

          role:
            member.role,

          credentialVerified:
            member.credentialVerified,
        })
      )
    );

    /**
     * Staff are hospital-owned.
     * No role/permission check is performed.
     */
    for (const member of cleanTeam) {
      await this.assertHospitalStaff(
        hospitalId,
        member.userId,
        'surgical team member ID'
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

    const leadSurgeonExists =
      cleanTeam.some(
        (member) =>
          member.role ===
            SurgicalRole.PRIMARY_SURGEON &&
          member.userId ===
            existingCase.leadSurgeonId.toString()
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
      cleanTeam.map(
        (member) => ({
          userId:
            member.userId,
        })
      ),
      caseId
    );

    const surgicalTeam =
      cleanTeam.map(
        (member) => ({
          userId:
            new Types.ObjectId(
              member.userId
            ),

          role:
            member.role,

          credentialVerified:
            member.credentialVerified ??
            false,

          assignedAt:
            new Date(),

          notes:
            member.notes,
        })
      );

    await SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
      },
      {
        $set: {
          surgicalTeam,

          updatedBy:
            new Types.ObjectId(
              updatedBy
            ),
        },
      },
      {
        new: true,
      }
    ).exec();

    return this.populateSurgeryCase(
      caseId,
      hospitalId
    );
  }

  public async rescheduleCase(
    caseId: string,
    hospitalId: string,
    updatedBy: string,
    input: RescheduleSurgeryInput
  ): Promise<ISurgeryCaseDocument | null> {
    await this.assertHospitalMember(
      hospitalId,
      updatedBy,
      'updater ID'
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
        SurgeryStatus.IN_PROGRESS,
        SurgeryStatus.COMPLETED,
        SurgeryStatus.CANCELLED,
      ].includes(
        existingCase.status
      )
    ) {
      throw new Error(
        'This surgery cannot be rescheduled in its current status.'
      );
    }

    const start =
      new Date(
        input.scheduledStartTime
      );

    const end =
      new Date(
        input.scheduledEndTime
      );

    this.validateTimeRange(
      start,
      end
    );

    const theatreId =
      input.theatreId ||
      existingCase.theatreId;

    await this.checkSchedulingConflicts(
      hospitalId,
      start,
      end,
      theatreId,
      existingCase.surgicalTeam.map(
        (member) => ({
          userId:
            member.userId.toString(),
        })
      ),
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
            start,

          scheduledEndTime:
            end,

          theatreId,

          postponementReason:
            input.reason,

          status:
            SurgeryStatus.SCHEDULED,

          updatedBy:
            new Types.ObjectId(
              updatedBy
            ),
        },
      },
      {
        new: true,
      }
    ).exec();
  }

  public async updateMedication(
    caseId: string,
    hospitalId: string,
    updatedBy: string,
    input: UpdateMedicationInput
  ): Promise<ISurgeryCaseDocument | null> {
    await this.assertHospitalMember(
      hospitalId,
      updatedBy,
      'updater ID'
    );

    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
      },
      {
        $push: {
          medications: {
            ...input,
            status: 'PLANNED',
          },
        },

        $set: {
          updatedBy:
            new Types.ObjectId(
              updatedBy
            ),
        },
      },
      {
        new: true,
      }
    ).exec();
  }

  public async administerMedication(
    caseId: string,
    hospitalId: string,
    administeredBy: string,
    input: AdministerMedicationInput
  ): Promise<ISurgeryCaseDocument | null> {
    await this.assertHospitalMember(
      hospitalId,
      administeredBy,
      'administering staff ID'
    );

    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,

        'medications._id':
          input.medicationId,

        'medications.status':
          'PLANNED',
      },
      {
        $set: {
          'medications.$.status':
            'ADMINISTERED',

          'medications.$.administeredAt':
            new Date(),

          'medications.$.administeredBy':
            new Types.ObjectId(
              administeredBy
            ),

          'medications.$.notes':
            input.notes,
        },
      },
      {
        new: true,
      }
    ).exec();
  }

  public async updateWHOChecklist(
    caseId: string,
    hospitalId: string,
    completedBy: string,
    input: UpdateWHOChecklistInput
  ): Promise<ISurgeryCaseDocument | null> {
    await this.assertHospitalMember(hospitalId, completedBy, 'checklist staff ID');
    this.validateObjectId(caseId, 'surgery case ID');

    const existingCase = await SurgeryCaseModel.findOne({
      _id: caseId,
      hospitalId,
    });

    if (!existingCase) return null;

    const checklist: any =
      existingCase.whoChecklist?.toObject?.() ||
      existingCase.whoChecklist ||
      {};

    const incoming: Record<string, any> = { ...(input.data || {}) };

    // The detail page keeps one shared form object between stages. It can
    // therefore send fields from the previous stage. Ignore fields that do
    // not belong to the active stage instead of rejecting the whole save.
    const stageFields: Record<'signIn' | 'timeOut' | 'signOut', string[]> = {
      signIn: [
        'patientIdentityConfirmed', 'procedureConfirmed', 'siteSideConfirmed',
        'consentVerified', 'anesthesiaSafetyConfirmed', 'pulseOximeterOn',
        'allergiesReviewed', 'allergyKnown', 'airwayRisk', 'bloodLossRisk',
        'bloodLossRiskOver500ml', 'siteMarked', 'notes',
      ],
      timeOut: [
        'patientConfirmed', 'patientIdentityConfirmed', 'procedureConfirmed',
        'surgicalSiteConfirmed', 'confirmPatientSiteProcedure', 'teamIntroduced',
        'consentVerified', 'siteMarked', 'antibioticProphylaxisConfirmed',
        'antibioticProphylaxisGiven', 'imagingAvailable', 'imagingDisplayed',
        'criticalConcernsSurgeon', 'criticalConcernsAnaesthetist',
        'criticalConcernsNursing', 'notes',
      ],
      signOut: [
        'procedureRecorded', 'instrumentCountCorrect', 'spongeCountCorrect',
        'needleCountCorrect', 'countsCorrect', 'specimenLabeled',
        'equipmentIssuesNoted', 'postOperativePlan', 'postOpRecoveryPlan', 'notes',
      ],
    };

    const allowed = new Set(stageFields[input.stage]);
    const stageData: Record<string, any> = {
      ...(checklist[input.stage] || {}),
    };

    for (const [key, value] of Object.entries(incoming)) {
      if (allowed.has(key)) stageData[key] = value;
    }

    // Accept the frontend's WHO terminology while also maintaining the
    // canonical fields used by the rest of the surgery workflow.
    if (input.stage === 'signIn') {
      if ('allergyKnown' in stageData) stageData.allergiesReviewed = stageData.allergyKnown;
      if ('bloodLossRiskOver500ml' in stageData) stageData.bloodLossRisk = stageData.bloodLossRiskOver500ml;
      if ('siteMarked' in stageData) stageData.siteSideConfirmed = stageData.siteMarked;
    }

    if (input.stage === 'timeOut') {
      if ('confirmPatientSiteProcedure' in stageData) stageData.surgicalSiteConfirmed = stageData.confirmPatientSiteProcedure;
      if ('antibioticProphylaxisGiven' in stageData) stageData.antibioticProphylaxisConfirmed = stageData.antibioticProphylaxisGiven;
      if ('imagingDisplayed' in stageData) stageData.imagingAvailable = stageData.imagingDisplayed;
    }

    if (input.stage === 'signOut') {
      if ('countsCorrect' in stageData) {
        stageData.instrumentCountCorrect = stageData.countsCorrect;
        stageData.spongeCountCorrect = stageData.countsCorrect;
        stageData.needleCountCorrect = stageData.countsCorrect;
      }
      if ('postOpRecoveryPlan' in stageData) stageData.postOperativePlan = stageData.postOpRecoveryPlan;
    }

    stageData.completed = true;
    stageData.completedAt = new Date();
    stageData.completedBy = new Types.ObjectId(completedBy);

    checklist[input.stage] = stageData;

    return SurgeryCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId },
      {
        $set: {
          whoChecklist: checklist,
          updatedBy: new Types.ObjectId(completedBy),
        },
      },
      { new: true }
    ).exec().then(() => this.populateSurgeryCase(caseId, hospitalId));
  }

  public async addVitalsLog(
    caseId: string,
    hospitalId: string,
    updatedBy: string,
    input: AddVitalsLogInput
  ): Promise<ISurgeryCaseDocument | null> {
    await this.assertHospitalMember(
      hospitalId,
      updatedBy,
      'updater ID'
    );

    const vitals = {
      ...input,

      timestamp:
        input.timestamp
          ? new Date(
              input.timestamp
            )
          : new Date(),
    };

    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
      },
      {
        $push: {
          vitalsTimeline:
            vitals,
        },

        $set: {
          updatedBy:
            new Types.ObjectId(
              updatedBy
            ),
        },
      },
      {
        new: true,
      }
    ).exec();
  }

  public async startSurgery(
    caseId: string,
    hospitalId: string,
    updatedBy: string
  ): Promise<ISurgeryCaseDocument | null> {
    await this.assertHospitalMember(
      hospitalId,
      updatedBy,
      'updater ID'
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
      ![
        SurgeryStatus.SCHEDULED,
        SurgeryStatus.PRE_OP_PREPARATION,
        SurgeryStatus.READY_FOR_THEATRE,
      ].includes(
        existingCase.status
      )
    ) {
      throw new Error(
        'This surgery cannot be started in its current status.'
      );
    }

    const preOp: any =
      existingCase.preOpAssessment
        ?.toObject?.() ||
      existingCase.preOpAssessment ||
      {};

    const checklist: any =
      existingCase.whoChecklist
        ?.toObject?.() ||
      existingCase.whoChecklist ||
      {};

    if (
      preOp.clearedForSurgery !==
      true
    ) {
      throw new Error(
        'Surgery has not been cleared by the authorized clinician.'
      );
    }

    if (
      checklist.signIn
        ?.completed !== true
    ) {
      throw new Error(
        'WHO sign-in must be completed before starting surgery.'
      );
    }

    if (
      checklist.timeOut
        ?.completed !== true
    ) {
      throw new Error(
        'WHO time-out must be completed before starting surgery.'
      );
    }

    if (
      existingCase.consent
        ?.procedureConsent !==
      true
    ) {
      throw new Error(
        'Procedure consent is required.'
      );
    }

    if (
      existingCase.consent
        ?.anesthesiaConsent !==
      true
    ) {
      throw new Error(
        'Anesthesia consent is required.'
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
            SurgeryStatus.READY_FOR_THEATRE,
          ],
        },
      },
      {
        $set: {
          status:
            SurgeryStatus.IN_PROGRESS,

          actualStartTime:
            new Date(),

          'intraopDocs.procedureStartTime':
            new Date(),

          updatedBy:
            new Types.ObjectId(
              updatedBy
            ),
        },
      },
      {
        new: true,
      }
    ).exec();
  }

  public async updateIntraopDocs(
    caseId: string,
    hospitalId: string,
    updatedBy: string,
    input: UpdateIntraopInput
  ): Promise<ISurgeryCaseDocument | null> {
    await this.assertHospitalMember(
      hospitalId,
      updatedBy,
      'updater ID'
    );

    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,

        hospitalId,

        status:
          SurgeryStatus.IN_PROGRESS,
      },
      {
        $set: {
          intraopDocs:
            input,

          updatedBy:
            new Types.ObjectId(
              updatedBy
            ),
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
    await this.assertHospitalMember(
      hospitalId,
      updatedBy,
      'updater ID'
    );

    const drugs =
      input.drugs?.map(
        (drug) => ({
          ...drug,

          administeredAt:
            drug.administeredAt
              ? new Date(
                  drug.administeredAt
                )
              : new Date(),

          administeredBy:
            new Types.ObjectId(
              updatedBy
            ),
        })
      );

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

          updatedBy:
            new Types.ObjectId(
              updatedBy
            ),
        },
      },
      {
        new: true,
      }
    ).exec();
  }

  private makeBillingSourceId(caseId: string, serviceCode: string): Types.ObjectId {
    const hex = createHash('sha256')
      .update(`${caseId}:${serviceCode}`)
      .digest('hex')
      .slice(0, 24);

    return new Types.ObjectId(hex);
  }

  private billingCode(value: string): string {
    return value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 70);
  }

  /**
   * Captures surgery charges after the clinical procedure has actually been
   * completed. Pricing is resolved centrally by the Billing module, so the
   * Surgery module never owns procedure prices.
   *
   * Missing catalogue entries do not roll back or break the clinical surgery
   * workflow. Instead, the surgery billing block records the exact errors and
   * can be retried through the billing endpoint after the hospital configures
   * the missing catalogue prices.
   */
  public async captureBilling(
    caseId: string,
    hospitalId: string,
    capturedBy: string,
    _input: CaptureSurgeryBillingInput = {}
  ): Promise<ISurgeryCaseDocument | null> {
    await this.assertHospitalMember(hospitalId, capturedBy, 'billing actor ID');

    const existingCase = await SurgeryCaseModel.findOne({
      _id: caseId,
      hospitalId,
    });

    if (!existingCase) return null;

    if (![SurgeryStatus.RECOVERY, SurgeryStatus.COMPLETED].includes(existingCase.status)) {
      throw new Error('Surgery billing can only be captured after the procedure has entered recovery or completed.');
    }

    const billing: {
      status: SurgeryBillingStatus;
      chargeIds: Types.ObjectId[];
      errors: string[];
      catalogueItemId?: Types.ObjectId;
      cataloguePlanName?: string;
      cataloguePrice?: number;
      catalogueVersion?: number;
      currency?: string;
      lastAttemptAt: Date;
      capturedAt?: Date;
    } = {
      status: SurgeryBillingStatus.NOT_ATTEMPTED,
      chargeIds: [] as Types.ObjectId[],
      errors: [] as string[],
      catalogueItemId: existingCase.pricingCatalogueItemId,
      cataloguePlanName: existingCase.pricingCataloguePlanName,
      cataloguePrice: existingCase.pricingCataloguePrice,
      catalogueVersion: existingCase.pricingCatalogueVersion,
      currency: existingCase.pricingCatalogueCurrency,
      lastAttemptAt: new Date(),
    };

    const procedureCode = this.billingProcedureCode(existingCase.procedureName);

    const items: Array<{
      code: string;
      description: string;
      category: ChargeCategory;
      quantity?: number;
      notes?: string;
    }> = [
      {
        code: procedureCode,
        description: `Surgical procedure: ${existingCase.procedureName}`,
        category: ChargeCategory.SURGERY,
      },
      {
        code: `SURGERY_PROFESSIONAL_${this.billingCode(existingCase.procedureName)}`,
        description: `Professional surgical fee: ${existingCase.procedureName}`,
        category: ChargeCategory.PROFESSIONAL_FEE,
      },
      {
        code: `ANAESTHESIA_${this.billingCode(existingCase.anesthesiaType)}`,
        description: `Anaesthesia: ${existingCase.anesthesiaType}`,
        category: ChargeCategory.ANAESTHESIA,
      },
    ];

    for (const item of existingCase.consumablesUsed || []) {
      const code = `SURGERY_CONSUMABLE_${this.billingCode(item.itemName)}`;
      items.push({
        code,
        description: `Surgical consumable: ${item.itemName}`,
        category: ChargeCategory.CONSUMABLE,
        quantity: Number(item.quantityUsed || 1),
        notes: item.lotNumber ? `Lot: ${item.lotNumber}` : undefined,
      });
    }

    for (const item of items) {
      try {
        const serviceDate =
          existingCase.actualEndTime ||
          existingCase.updatedAt ||
          new Date();

        const selectedForItem =
          item.code === procedureCode
            ? existingCase.pricingCatalogueItemId
            : undefined;

        const resolvedPrice = await resolvePrice({
          hospitalId,
          code: item.code,
          departmentName: 'Surgery',
          category: item.category,
          serviceDate,
        });

        const charge = await createCharge({
          hospitalId,
          patientId: String(existingCase.patientId),
          description: item.description,
          category: item.category,
          sourceModule: BillingSourceModule.SURGERY,
          sourceId: this.makeBillingSourceId(caseId, item.code),
          serviceCode: item.code,
          catalogueItemId: selectedForItem || resolvedPrice.catalogueItemId,
          departmentName: 'Surgery',
          quantity: item.quantity ?? 1,
          notes: item.notes,
          chargeDate: serviceDate,
        });

        if (charge?._id) {
          billing.chargeIds.push(new Types.ObjectId(String(charge._id)));
        }
      } catch (error: any) {
        billing.errors.push(
          `${item.code}: ${error?.message || 'Unable to create billing charge.'}`
        );
      }
    }

    if (billing.errors.length === 0) {
      billing.status = SurgeryBillingStatus.CAPTURED;
      billing.capturedAt = new Date();
    } else if (billing.chargeIds.length > 0) {
      billing.status = SurgeryBillingStatus.PARTIAL;
    } else {
      billing.status = SurgeryBillingStatus.FAILED;
    }

    return SurgeryCaseModel.findOneAndUpdate(
      { _id: caseId, hospitalId },
      {
        $set: {
          billing,
          updatedBy: new Types.ObjectId(capturedBy),
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
    await this.assertHospitalMember(
      hospitalId,
      updatedBy,
      'updater ID'
    );

    const existingCase =
      await SurgeryCaseModel.findOne({
        _id: caseId,
        hospitalId,
        status:
          SurgeryStatus.IN_PROGRESS,
      });

    if (!existingCase) {
      return null;
    }

    const checklist: any =
      existingCase.whoChecklist
        ?.toObject?.() ||
      existingCase.whoChecklist ||
      {};

    if (
      checklist.signOut
        ?.completed !== true
    ) {
      throw new Error(
        'WHO sign-out must be completed before surgery can enter recovery.'
      );
    }

    const now = new Date();

    const currentDocs =
      existingCase.intraopDocs
        ?.toObject?.() ||
      existingCase.intraopDocs ||
      {};

    const intraopDocs = {
      ...currentDocs,

      ...(input.intraopDocs ||
        {}),

      procedureEndTime:
        now,

      closureTime:
        input.intraopDocs
          ?.closureTime ||
        now,
    };

    const completedCase = await SurgeryCaseModel.findOneAndUpdate(
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

    if (!completedCase) return null;

    // Billing is intentionally non-blocking: a missing price catalogue entry
    // must never prevent the clinical surgery from completing.
    try {
      return (await this.captureBilling(caseId, hospitalId, updatedBy)) || completedCase;
    } catch (error: any) {
      await SurgeryCaseModel.findOneAndUpdate(
        { _id: caseId, hospitalId },
        {
          $set: {
            billing: {
              status: SurgeryBillingStatus.FAILED,
              chargeIds: [],
              errors: [error?.message || 'Unable to capture surgery billing.'],
              lastAttemptAt: new Date(),
            },
          },
        }
      ).exec();

      return completedCase;
    }
  }

  public async updateRecovery(
    caseId: string,
    hospitalId: string,
    assessedBy: string,
    input: RecoveryInput
  ): Promise<ISurgeryCaseDocument | null> {
    await this.assertHospitalMember(
      hospitalId,
      assessedBy,
      'assessor ID'
    );

    const existingCase =
      await SurgeryCaseModel.findOne({
        _id: caseId,
        hospitalId,
        status:
          SurgeryStatus.RECOVERY,
      });

    if (!existingCase) {
      return null;
    }

    const recoveryAssessment = {
      ...input,

      arrivalTime:
        existingCase
          .recoveryAssessment
          ?.arrivalTime ||
        new Date(),

      assessedBy:
        new Types.ObjectId(
          assessedBy
        ),
    };

    return SurgeryCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        hospitalId,
        status:
          SurgeryStatus.RECOVERY,
      },
      {
        $set: {
          recoveryAssessment,

          status:
            input.dischargeCriteriaMet
              ? SurgeryStatus.COMPLETED
              : SurgeryStatus.RECOVERY,

          updatedBy:
            new Types.ObjectId(
              assessedBy
            ),
        },
      },
      {
        new: true,
      }
    ).exec();
  }

  public async cancelCase(
    caseId: string,
    hospitalId: string,
    updatedBy: string,
    cancellationReason: string
  ): Promise<ISurgeryCaseDocument | null> {
    await this.assertHospitalMember(
      hospitalId,
      updatedBy,
      'updater ID'
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
      ].includes(
        existingCase.status
      )
    ) {
      throw new Error(
        'This surgery can no longer be cancelled.'
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

          cancellationReason,

          updatedBy:
            new Types.ObjectId(
              updatedBy
            ),
        },
      },
      {
        new: true,
      }
    ).exec();
  }

  public async postponeCase(
    caseId: string,
    hospitalId: string,
    updatedBy: string,
    reason: string
  ): Promise<ISurgeryCaseDocument | null> {
    await this.assertHospitalMember(
      hospitalId,
      updatedBy,
      'updater ID'
    );

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
          status:
            SurgeryStatus.POSTPONED,

          postponementReason:
            reason,

          updatedBy:
            new Types.ObjectId(
              updatedBy
            ),
        },
      },
      {
        new: true,
      }
    ).exec();
  }

  public async insertEmergencyCase(
    hospitalId: string,
    createdBy: string,
    input: CreateSurgeryCaseInput
  ): Promise<ISurgeryCaseDocument> {
    return this.scheduleCase(
      hospitalId,
      createdBy,
      {
        ...input,

        urgency:
          UrgencyLevel.EMERGENCY,

        priority:
          input.priority ?? 100,
      }
    );
  }
}

export const surgeryService =
  new SurgeryService();