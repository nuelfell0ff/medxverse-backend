import { Types, model } from 'mongoose';
import {
  ICUAdmissionModel,
  DeviceReadingModel,
  FlowsheetEntryModel,
  ICUScoreModel,
  FamilyCommunicationLogModel,
} from './icu.model.js';
import {
  CreateFamilyCommunicationInput,
  CreateICUAdmissionInput,
  FlowEntrySource,
  GetICUAdmissionsQuery,
  IICUAdmissionDocument,
  IICUVitals,
  ICUDashboardData,
  ICUCaseStatus,
  IDeviceMeasurement,
  IngestDeviceReadingInput,
  RecalculateScoresInput,
  UpdateICUStatusInput,
  UpdateICUVitalsInput,
  UpdateVentilatorSettingsInput,
  UpsertFlowsheetEntryInput,
} from './icu.types.js';
import { icuDeviceGatewayService } from './icu.device-gateway.service.js';
import { icuScoringService } from './icu.scoring.service.js';
import { publishEhrResource } from '../patient/ehr.publisher.js';
import { WardModel } from '../bed-ward/bed-ward.model.js';


/**
 * Normalize vital-sign payloads from older/front-end field names to the
 * canonical ICU schema names. This prevents values from being written only
 * to the flowsheet while Mongoose silently drops unknown admission fields.
 */
function normalizeICUVitals(input: Record<string, unknown> = {}): IICUVitals {
  const output: IICUVitals = {};

  const pickNumber = (...keys: string[]) => {
    for (const key of keys) {
      const value = input[key];
      if (value === undefined || value === null || value === '') continue;
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
  };

  output.heartRateBpm = pickNumber('heartRateBpm', 'heartRate', 'heartrate', 'hr');
  output.systolicBpMmHg = pickNumber(
    'systolicBpMmHg',
    'systolicBP',
    'systolicBp',
    'bloodPressure',
    'bloodpressure',
    'bp',
  );
  output.diastolicBpMmHg = pickNumber(
    'diastolicBpMmHg',
    'diastolicBP',
    'diastolicBp',
  );
  output.meanArterialPressureMmHg = pickNumber(
    'meanArterialPressureMmHg',
    'meanArterialPressure',
    'map',
  );
  output.respiratoryRateBpm = pickNumber(
    'respiratoryRateBpm',
    'respiratoryRate',
    'respiratoryrate',
    'rr',
  );
  output.oxygenSaturationPct = pickNumber(
    'oxygenSaturationPct',
    'oxygenSaturation',
    'spo2',
    'SpO2',
    'o2Saturation',
  );
  output.temperatureCelsius = pickNumber(
    'temperatureCelsius',
    'temperature',
    'temp',
  );
  output.centralVenousPressureMmHg = pickNumber(
    'centralVenousPressureMmHg',
    'centralVenousPressure',
    'cvp',
  );
  output.intracranialPressureMmHg = pickNumber(
    'intracranialPressureMmHg',
    'intracranialPressure',
    'icp',
  );
  output.glasgowComaScale = pickNumber(
    'glasgowComaScale',
    'gcs',
    'GCS',
  );

  // Remove undefined values so a partial update does not overwrite
  // previously recorded vital signs.
  for (const key of Object.keys(output) as Array<keyof IICUVitals>) {
    if (output[key] === undefined) delete output[key];
  }

  return output;
}

export class ICUService {
  private validateObjectId(id: string | undefined | null, field: string): string {
    if (!id || !Types.ObjectId.isValid(id)) throw new Error(`Invalid ${field}.`);
    return id;
  }

  private async assertHospitalMember(hospitalId: string, accountId: string): Promise<void> {
    this.validateObjectId(hospitalId, 'hospital ID');
    this.validateObjectId(accountId, 'actor ID');

    const account = await model('Account')
      .findOne({ _id: accountId, hospitalId })
      .select('_id')
      .lean();

    if (!account) throw new Error('The authenticated user does not belong to this hospital.');
  }

  private async assertPatientBelongsToHospital(hospitalId: string, patientId: string): Promise<void> {
    this.validateObjectId(hospitalId, 'hospital ID');
    this.validateObjectId(patientId, 'patient ID');

    const patient = await model('Patient')
      .findOne({ _id: patientId, hospitalId })
      .select('_id')
      .lean();

    if (!patient) throw new Error('Patient does not belong to this hospital.');
  }

  private async getAdmissionOrThrow(admissionId: string, hospitalId: string) {
    this.validateObjectId(admissionId, 'ICU admission ID');
    const admission = await ICUAdmissionModel.findOne({ _id: admissionId, $or: [{ hospitalId: new Types.ObjectId(hospitalId) }, { hospitalId }] });
    if (!admission) throw new Error('ICU admission not found.');
    return admission;
  }

  public async createAdmission(hospitalId: string, input: CreateICUAdmissionInput): Promise<IICUAdmissionDocument> {
    await this.assertHospitalMember(hospitalId, input.admittedById);
    this.validateObjectId(input.patientId, 'patient ID');
    await this.assertPatientBelongsToHospital(hospitalId, input.patientId);

    if (!input.wardId?.trim() || !Types.ObjectId.isValid(input.wardId)) throw new Error('Valid ICU ward ID is required.');
    if (!input.bedNumber?.trim()) throw new Error('ICU bed number is required.');
    if (!input.admissionReason?.trim()) throw new Error('Admission reason is required.');
    if (!input.primaryDiagnosis?.trim()) throw new Error('Primary diagnosis is required.');

    const ward = await WardModel.findOne({
      _id: new Types.ObjectId(input.wardId),
      hospitalId: new Types.ObjectId(hospitalId),
      active: true,
    }).select('_id').lean();
    if (!ward) throw new Error('ICU ward not found or is inactive.');

    if (input.attendingPhysicianId) this.validateObjectId(input.attendingPhysicianId, 'attending physician ID');
    if (input.sourceSurgeryCaseId) this.validateObjectId(input.sourceSurgeryCaseId, 'source surgery case ID');
    if (input.encounterId) this.validateObjectId(input.encounterId, 'encounter ID');

    const admission = await ICUAdmissionModel.create({
      hospitalId: new Types.ObjectId(hospitalId),
      patientId: new Types.ObjectId(input.patientId),
      wardId: new Types.ObjectId(input.wardId),
      bedNumber: input.bedNumber.trim(),
      careLevel: input.careLevel,
      primaryDiagnosis: input.primaryDiagnosis.trim(),
      admissionReason: input.admissionReason.trim(),
      attendingPhysicianId: input.attendingPhysicianId ? new Types.ObjectId(input.attendingPhysicianId) : undefined,
      admittedById: new Types.ObjectId(input.admittedById),
      vitals: input.vitals,
      ventilatorSettings: input.ventilatorSettings,
      sourceSurgeryCaseId: input.sourceSurgeryCaseId ? new Types.ObjectId(input.sourceSurgeryCaseId) : undefined,
      encounterId: input.encounterId ? new Types.ObjectId(input.encounterId) : undefined,
    });

    await publishEhrResource({
      hospitalId,
      patientId: input.patientId,
      actorId: input.admittedById,
      resourceType: 'Encounter',
      resourceId: admission._id.toString(),
      department: 'ICU',
      status: admission.status,
      resource: {
        type: 'ICUAdmission',
        id: admission._id.toString(),
        patientId: input.patientId,
        bedNumber: admission.bedNumber,
        wardId: input.wardId,
        admissionReason: admission.admissionReason,
        careLevel: admission.careLevel,
        primaryDiagnosis: admission.primaryDiagnosis,
        admittedAt: admission.admittedAt,
        sourceSurgeryCaseId: input.sourceSurgeryCaseId,
      },
      reason: 'ICU admission created',
    });

    return admission;
  }

  public async getAdmissions(
    hospitalId: string,
    query: GetICUAdmissionsQuery,
  ): Promise<{ admissions: IICUAdmissionDocument[]; total: number; page: number; totalPages: number }> {
    this.validateObjectId(hospitalId, 'hospital ID');
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    // Always scope admissions to the authenticated hospital.  Use both the
    // ObjectId and string representation because older ICU records may have
    // been persisted with a string hospitalId before the ICU schema was
    // normalized to ObjectId.
    const hospitalObjectId = new Types.ObjectId(hospitalId);
    const filter: Record<string, unknown> = {
      $or: [{ hospitalId: hospitalObjectId }, { hospitalId }],
    };
    if (query.status) filter.status = query.status;
    if (query.careLevel) filter.careLevel = query.careLevel;
    if (query.patientId) filter.patientId = this.validateObjectId(query.patientId, 'patient ID');
    if (query.wardId) filter.wardId = this.validateObjectId(query.wardId, 'ward ID');
    if (query.bedNumber) filter.bedNumber = { $regex: query.bedNumber, $options: 'i' };

    const [admissions, total] = await Promise.all([
      ICUAdmissionModel.find(filter)
        .populate('patientId', 'firstName lastName mrn dateOfBirth gender bloodGroup phone')
        .populate('wardId', 'code name department floor building specialty')
        .populate('transferredToWardId', 'code name department floor building specialty')
        .populate('attendingPhysicianId', 'staffId firstName middleName lastName role professionalTitle jobTitle')
                .sort({ admittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      ICUAdmissionModel.countDocuments(filter),
    ]);

    return { admissions, total, page, totalPages: Math.ceil(total / limit) };
  }

  public async getAdmissionById(admissionId: string, hospitalId: string): Promise<IICUAdmissionDocument | null> {
    this.validateObjectId(admissionId, 'ICU admission ID');
    this.validateObjectId(hospitalId, 'hospital ID');

    return ICUAdmissionModel.findOne({ _id: admissionId, $or: [{ hospitalId: new Types.ObjectId(hospitalId) }, { hospitalId }] })
      .populate('patientId', 'firstName lastName mrn dateOfBirth gender bloodGroup phone')
      .populate('wardId', 'code name department floor building specialty')
      .populate('attendingPhysicianId', 'staffId firstName middleName lastName role professionalTitle jobTitle')
            .populate('transferredToWardId', 'code name department floor building specialty')
      .exec();
  }

  public async updateVitals(
    admissionId: string,
    hospitalId: string,
    actorId: string,
    input: UpdateICUVitalsInput,
  ): Promise<IICUAdmissionDocument | null> {
    await this.assertHospitalMember(hospitalId, actorId);
    const admission = await this.getAdmissionOrThrow(admissionId, hospitalId);

    // Accept both the current canonical field names and legacy frontend
    // names, then persist only fields that exist on ICUAdmission.vitals.
    const vitals = normalizeICUVitals((input.vitals || {}) as Record<string, unknown>);

    if (!Object.keys(vitals).length) {
      throw new Error('At least one valid vital sign is required.');
    }

    const updated = await ICUAdmissionModel.findOneAndUpdate(
      {
        _id: admission._id,
        hospitalId,
        status: { $in: [ICUCaseStatus.ADMITTED, ICUCaseStatus.STABILIZED] },
      },
      { $set: { vitals } },
      { new: true, runValidators: true },
    ).exec();

    if (updated) {
      const entries = Object.entries(vitals).filter(([, value]) => value !== undefined);

      if (entries.length) {
        await FlowsheetEntryModel.insertMany(
          entries.map(([parameter, value]) => ({
            hospitalId: new Types.ObjectId(hospitalId),
            admissionId: admission._id,
            patientId: admission.patientId,
            recordedAt: new Date(),
            category: 'VITALS',
            parameter,
            value,
            source: FlowEntrySource.MANUAL,
            enteredById: new Types.ObjectId(actorId),
            status: 'CONFIRMED',
          })),
        );
      }
    }

    return updated;
  }

  public async updateVentilatorSettings(
    admissionId: string,
    hospitalId: string,
    actorId: string,
    input: UpdateVentilatorSettingsInput,
  ): Promise<IICUAdmissionDocument | null> {
    await this.assertHospitalMember(hospitalId, actorId);
    const admission = await this.getAdmissionOrThrow(admissionId, hospitalId);

    return ICUAdmissionModel.findOneAndUpdate(
      { _id: admission._id, hospitalId, status: { $in: [ICUCaseStatus.ADMITTED, ICUCaseStatus.STABILIZED] } },
      { $set: { ventilatorSettings: input.ventilatorSettings } },
      { new: true },
    ).exec();
  }

  public async updateStatus(
    admissionId: string,
    hospitalId: string,
    actorId: string,
    input: UpdateICUStatusInput,
  ): Promise<IICUAdmissionDocument | null> {
    await this.assertHospitalMember(hospitalId, actorId);
    const admission = await this.getAdmissionOrThrow(admissionId, hospitalId);

    const activeStatuses = [ICUCaseStatus.ADMITTED, ICUCaseStatus.STABILIZED];
    const allowedTransitions: Record<string, ICUCaseStatus[]> = {
      [ICUCaseStatus.ADMITTED]: [ICUCaseStatus.STABILIZED, ICUCaseStatus.TRANSFERRED_OUT, ICUCaseStatus.DISCHARGED, ICUCaseStatus.DECEASED],
      [ICUCaseStatus.STABILIZED]: [ICUCaseStatus.TRANSFERRED_OUT, ICUCaseStatus.DISCHARGED, ICUCaseStatus.DECEASED],
    };

    if (admission.status !== input.status) {
      const allowed = allowedTransitions[admission.status] || [];
      if (!allowed.includes(input.status)) throw new Error(`Invalid ICU status transition: ${admission.status} -> ${input.status}.`);
    }

    const updateData: Record<string, unknown> = { status: input.status };
    if (input.dispositionNotes !== undefined) updateData.dispositionNotes = input.dispositionNotes;
    if (input.transferredToWardId) updateData.transferredToWardId = new Types.ObjectId(this.validateObjectId(input.transferredToWardId, 'ward ID'));
    if (!activeStatuses.includes(input.status)) updateData.dischargedAt = input.dischargedAt || new Date();

    const updated = await ICUAdmissionModel.findOneAndUpdate(
      { _id: admission._id, hospitalId },
      { $set: updateData },
      { new: true },
    ).exec();

    if (updated) {
      await publishEhrResource({
        hospitalId,
        patientId: admission.patientId.toString(),
        actorId,
        resourceType: 'Encounter',
        resourceId: admission._id.toString(),
        department: 'ICU',
        status: updated.status,
        resource: {
          type: 'ICUAdmission',
          id: updated._id.toString(),
          status: updated.status,
          dischargedAt: updated.dischargedAt,
          dispositionNotes: updated.dispositionNotes,
        },
        reason: 'ICU admission status updated',
      });
    }

    return updated;
  }

  public async ingestDeviceReading(hospitalId: string, actorId: string, input: IngestDeviceReadingInput) {
    await this.assertHospitalMember(hospitalId, actorId);
    return icuDeviceGatewayService.ingest(hospitalId, actorId, input);
  }

  public async getDeviceReadings(
    hospitalId: string,
    admissionId: string,
    options: { from?: string; to?: string; deviceId?: string; parameter?: string; limit?: number },
  ) {
    this.validateObjectId(hospitalId, 'hospital ID');
    const admission = await this.getAdmissionOrThrow(admissionId, hospitalId);
    const filter: Record<string, unknown> = {
      'metadata.hospitalId': hospitalId,
      'metadata.admissionId': admission._id.toString(),
    };
    if (options.deviceId) filter.deviceId = options.deviceId;
    if (options.from || options.to) {
      filter.recordedAt = {};
      if (options.from) (filter.recordedAt as Record<string, Date>).$gte = new Date(options.from);
      if (options.to) (filter.recordedAt as Record<string, Date>).$lte = new Date(options.to);
    }
    const readings = await DeviceReadingModel.find(filter)
      .sort({ recordedAt: -1 })
      .limit(Math.min(5000, Math.max(1, options.limit || 1000)))
      .lean();

    if (!options.parameter) return readings;

    return readings
      .map((reading) => ({
        ...reading,
        measurements: reading.measurements.filter((m: IDeviceMeasurement) => m.parameter === options.parameter),
      }))
      .filter((reading) => reading.measurements.length);
  }

  public async getTrends(
    hospitalId: string,
    admissionId: string,
    options: { parameter: string; from?: string; to?: string; deviceId?: string; limit?: number },
  ) {
    this.validateObjectId(hospitalId, 'hospital ID');
    if (!options.parameter?.trim()) throw new Error('Trend parameter is required.');
    const admission = await this.getAdmissionOrThrow(admissionId, hospitalId);

    const filter: Record<string, unknown> = {
      'metadata.hospitalId': hospitalId,
      'metadata.admissionId': admission._id.toString(),
    };
    if (options.deviceId) filter.deviceId = options.deviceId;
    if (options.from || options.to) {
      filter.recordedAt = {};
      if (options.from) (filter.recordedAt as Record<string, Date>).$gte = new Date(options.from);
      if (options.to) (filter.recordedAt as Record<string, Date>).$lte = new Date(options.to);
    }

    const readings = await DeviceReadingModel.find(filter)
      .sort({ recordedAt: 1 })
      .limit(Math.min(10000, Math.max(1, options.limit || 5000)))
      .lean();

    const points: Array<{ recordedAt: Date; value: number | string | boolean; unit?: string; deviceId: string; quality: string }> = [];
    for (const reading of readings) {
      const measurement = reading.measurements.find((m: IDeviceMeasurement) => m.parameter === options.parameter);
      if (measurement) {
        points.push({
          recordedAt: reading.recordedAt,
          value: measurement.value,
          unit: measurement.unit,
          deviceId: reading.deviceId,
          quality: reading.quality,
        });
      }
    }
    return points;
  }

  public async getFlowsheet(
    hospitalId: string,
    admissionId: string,
    options: { from?: string; to?: string; parameter?: string; status?: string; limit?: number },
  ) {
    this.validateObjectId(hospitalId, 'hospital ID');
    const admission = await this.getAdmissionOrThrow(admissionId, hospitalId);
    const filter: Record<string, unknown> = {
      hospitalId: new Types.ObjectId(hospitalId),
      admissionId: admission._id,
    };
    if (options.parameter) filter.parameter = options.parameter;
    if (options.status) filter.status = options.status;
    if (options.from || options.to) {
      filter.recordedAt = {};
      if (options.from) (filter.recordedAt as Record<string, Date>).$gte = new Date(options.from);
      if (options.to) (filter.recordedAt as Record<string, Date>).$lte = new Date(options.to);
    }
    return FlowsheetEntryModel.find(filter)
      .sort({ recordedAt: -1 })
      .limit(Math.min(5000, Math.max(1, options.limit || 1000)))
                  .lean();
  }

  public async confirmFlowsheetEntry(
    hospitalId: string,
    actorId: string,
    entryId: string,
    annotation?: string,
  ) {
    await this.assertHospitalMember(hospitalId, actorId);
    this.validateObjectId(entryId, 'flowsheet entry ID');

    return FlowsheetEntryModel.findOneAndUpdate(
      { _id: entryId, hospitalId: new Types.ObjectId(hospitalId) },
      {
        $set: {
          status: 'CONFIRMED',
          reviewedById: new Types.ObjectId(actorId),
          reviewedAt: new Date(),
          ...(annotation !== undefined ? { annotation } : {}),
        },
      },
      { new: true },
    ).exec();
  }

  public async addFlowsheetEntry(hospitalId: string, actorId: string, input: UpsertFlowsheetEntryInput) {
    await this.assertHospitalMember(hospitalId, actorId);
    const admission = await this.getAdmissionOrThrow(input.admissionId, hospitalId);
    const recordedAt = new Date(input.recordedAt);
    if (Number.isNaN(recordedAt.getTime())) throw new Error('Invalid flowsheet timestamp.');

    return FlowsheetEntryModel.create({
      hospitalId: new Types.ObjectId(hospitalId),
      admissionId: admission._id,
      patientId: admission.patientId,
      recordedAt,
      category: input.category,
      parameter: input.parameter,
      value: input.value,
      unit: input.unit,
      source: input.source || FlowEntrySource.MANUAL,
      sourceDeviceReadingId: input.sourceDeviceReadingId ? new Types.ObjectId(input.sourceDeviceReadingId) : undefined,
      enteredById: new Types.ObjectId(actorId),
      annotation: input.annotation,
      status: input.source === FlowEntrySource.DEVICE ? 'PENDING_REVIEW' : 'CONFIRMED',
    });
  }

  public async recalculateScores(hospitalId: string, actorId: string, input: RecalculateScoresInput) {
    await this.assertHospitalMember(hospitalId, actorId);
    return icuScoringService.recalculate(hospitalId, actorId, input);
  }

  public async recalculateScoresFromUnderlyingData(
    hospitalId: string,
    actorId: string,
    admissionId: string,
  ) {
    await this.assertHospitalMember(hospitalId, actorId);
    return icuScoringService.recalculateFromUnderlyingData(hospitalId, actorId, admissionId);
  }

  public async getScores(hospitalId: string, admissionId: string, scoreType?: string) {
    this.validateObjectId(hospitalId, 'hospital ID');
    const admission = await this.getAdmissionOrThrow(admissionId, hospitalId);
    const filter: Record<string, unknown> = {
      hospitalId: new Types.ObjectId(hospitalId),
      admissionId: admission._id,
    };
    if (scoreType) filter.scoreType = scoreType;
    return ICUScoreModel.find(filter).sort({ calculatedAt: -1 }).limit(100).lean();
  }

  public async addFamilyCommunication(
    hospitalId: string,
    actorId: string,
    input: CreateFamilyCommunicationInput,
  ) {
    await this.assertHospitalMember(hospitalId, actorId);
    const admission = await this.getAdmissionOrThrow(input.admissionId, hospitalId);

    if (!input.contactName?.trim()) throw new Error('Family contact name is required.');
    if (!input.summary?.trim()) throw new Error('Communication summary is required.');

    return FamilyCommunicationLogModel.create({
      hospitalId: new Types.ObjectId(hospitalId),
      admissionId: admission._id,
      patientId: admission.patientId,
      communicatedById: new Types.ObjectId(actorId),
      contactName: input.contactName.trim(),
      relationship: input.relationship?.trim(),
      contactMethod: input.contactMethod,
      topics: input.topics || [],
      summary: input.summary.trim(),
      questionsOrConcerns: input.questionsOrConcerns?.trim(),
      followUpRequired: Boolean(input.followUpRequired),
      followUpPlan: input.followUpPlan?.trim(),
    });
  }

  public async getFamilyCommunications(hospitalId: string, admissionId: string) {
    this.validateObjectId(hospitalId, 'hospital ID');
    const admission = await this.getAdmissionOrThrow(admissionId, hospitalId);

    return FamilyCommunicationLogModel.find({
      hospitalId: new Types.ObjectId(hospitalId),
      admissionId: admission._id,
    })
      .sort({ communicatedAt: -1 })
            .lean();
  }

    public async getDashboard(
    hospitalId: string,
    admissionId: string,
  ): Promise<ICUDashboardData> {
    const admission = await this.getAdmissionById(admissionId, hospitalId);

    if (!admission) {
      throw new Error('ICU admission not found.');
    }

    this.validateObjectId(hospitalId, 'hospital ID');
    this.validateObjectId(admissionId, 'ICU admission ID');

    const hospitalObjectId = new Types.ObjectId(hospitalId);
    const admissionObjectId = new Types.ObjectId(admissionId);

    const [
      latestReadings,
      recentFlowsheet,
      latestScores,
      familyCommunications,
    ] = await Promise.all([
      DeviceReadingModel.find({
        hospitalId: hospitalObjectId,
        admissionId: admissionObjectId,
      })
        .sort({ recordedAt: -1 })
        .limit(100)
        .exec(),

      FlowsheetEntryModel.find({
        hospitalId: hospitalObjectId,
        admissionId: admissionObjectId,
      })
        .sort({ recordedAt: -1 })
        .limit(250)
                        .exec(),

      ICUScoreModel.find({
        hospitalId: hospitalObjectId,
        admissionId: admissionObjectId,
      })
        .sort({ calculatedAt: -1 })
        .limit(100)
        .exec(),

      FamilyCommunicationLogModel.find({
        hospitalId: hospitalObjectId,
        admissionId: admissionObjectId,
      })
        .sort({ communicatedAt: -1 })
                .exec(),
    ]);

    return {
      admission,
      latestReadings,
      recentFlowsheet,
      latestScores,
      familyCommunications,
    };
  }
}
export const icuService = new ICUService();
