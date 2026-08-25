import { OutpatientModel } from './outpatient.model.js';
import {
  BillingCaptureStatus,
  ConsultationStatus,
  CompleteConsultationInput,
  CreateOutpatientInput,
  GetOutpatientQuery,
  IOutpatientDocument,
  OUTPATIENT_CONSULTATION_SERVICE_CODE,
  UpdateVitalsInput,
} from './outpatient.types.js';

import {
  createCharge,
} from '../billing/billing.service.js';

import {
  BillingSourceModule,
  ChargeCategory,
} from '../billing/billing.types.js';

export class OutpatientService {
  public async createEncounter(
    input: CreateOutpatientInput
  ): Promise<IOutpatientDocument> {
    return OutpatientModel.create({
      ...input,
      status: ConsultationStatus.IN_QUEUE,
      queuedAt: new Date(),
      billing: {
        status: BillingCaptureStatus.NOT_ATTEMPTED,
        serviceCode: OUTPATIENT_CONSULTATION_SERVICE_CODE,
      },
    });
  }

  public async getQueue(
    hospitalId: string,
    query: GetOutpatientQuery
  ): Promise<{
    encounters: IOutpatientDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hospitalId };

    if (query.status) filter.status = query.status;
    if (query.doctorId) filter.doctorId = query.doctorId;
    if (query.triagePriority) filter.triagePriority = query.triagePriority;

    const [encounters, total] = await Promise.all([
      OutpatientModel.find(filter)
        .populate('patientId', 'firstName lastName mrn gender dateOfBirth phone')
        .populate('doctorId', 'firstName lastName role department')
        .sort({ queuedAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),

      OutpatientModel.countDocuments(filter),
    ]);

    return {
      encounters: encounters as unknown as IOutpatientDocument[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getEncounterById(
    encounterId: string,
    hospitalId: string
  ): Promise<IOutpatientDocument | null> {
    return OutpatientModel.findOne({
      _id: encounterId,
      hospitalId,
    })
      .populate('patientId', 'firstName lastName mrn gender dateOfBirth phone')
      .populate('doctorId', 'firstName lastName role department')
      .lean()
      .exec() as unknown as IOutpatientDocument | null;
  }

  public async recordVitals(
    encounterId: string,
    hospitalId: string,
    input: UpdateVitalsInput
  ): Promise<IOutpatientDocument | null> {
    const bmi =
      input.vitalSigns.height && input.vitalSigns.weight
        ? parseFloat(
            (
              input.vitalSigns.weight /
              Math.pow(input.vitalSigns.height / 100, 2)
            ).toFixed(2)
          )
        : undefined;

    return OutpatientModel.findOneAndUpdate(
      {
        _id: encounterId,
        hospitalId,
      },
      {
        $set: {
          vitalSigns: {
            ...input.vitalSigns,
            bmi,
          },
          nursingNotes: input.nursingNotes,
          status: ConsultationStatus.WAITING_FOR_DOCTOR,
        },
      },
      { new: true }
    )
      .populate('patientId', 'firstName lastName mrn gender dateOfBirth phone')
      .populate('doctorId', 'firstName lastName role department')
      .lean()
      .exec() as unknown as IOutpatientDocument | null;
  }

  public async startConsultation(
    encounterId: string,
    hospitalId: string,
    doctorId: string
  ): Promise<IOutpatientDocument | null> {
    return OutpatientModel.findOneAndUpdate(
      {
        _id: encounterId,
        hospitalId,
      },
      {
        $set: {
          doctorId,
          status: ConsultationStatus.IN_CONSULTATION,
          consultationStartedAt: new Date(),
        },
      },
      { new: true }
    )
      .populate('patientId', 'firstName lastName mrn gender dateOfBirth phone')
      .populate('doctorId', 'firstName lastName role department')
      .lean()
      .exec() as unknown as IOutpatientDocument | null;
  }

  /**
   * Captures the outpatient consultation charge through the centralized
   * billing module. Billing failures are deliberately isolated from the
   * clinical workflow so a pricing/configuration problem never prevents
   * completion of the consultation.
   *
   * The Billing module resolves the current catalogue price using:
   * OUTPATIENT_CONSULTATION + hospital + department + service date.
   */
  public async captureBilling(
    encounterId: string,
    hospitalId: string,
    chargedBy?: string
  ): Promise<IOutpatientDocument | null> {
    const encounter = await OutpatientModel.findOne({
      _id: encounterId,
      hospitalId,
    });

    if (!encounter) return null;

    if (encounter.billing?.status === BillingCaptureStatus.CAPTURED) {
      return this.getEncounterById(encounterId, hospitalId);
    }

    if (!encounter.patientId) {
      encounter.billing = {
        status: BillingCaptureStatus.FAILED,
        serviceCode: OUTPATIENT_CONSULTATION_SERVICE_CODE,
        error: 'Patient is missing from the outpatient encounter.',
      };
      await encounter.save();
      return this.getEncounterById(encounterId, hospitalId);
    }

    try {
      const charge = await createCharge({
        hospitalId,
        patientId: String(encounter.patientId),
        serviceCode: OUTPATIENT_CONSULTATION_SERVICE_CODE,
        description: 'Outpatient Consultation',
        category: ChargeCategory.CONSULTATION,
        sourceModule: BillingSourceModule.OUTPATIENT,
        sourceId: String(encounter._id),
        departmentId: encounter.departmentId
          ? String(encounter.departmentId)
          : undefined,
        chargedBy: chargedBy || (encounter.doctorId
          ? String(encounter.doctorId)
          : undefined),
        chargeDate: encounter.consultationEndedAt || new Date(),
        quantity: 1,
      });

      encounter.billing = {
        status: BillingCaptureStatus.CAPTURED,
        chargeId: charge._id,
        serviceCode: OUTPATIENT_CONSULTATION_SERVICE_CODE,
        capturedAt: new Date(),
      };

      await encounter.save();
    } catch (error: any) {
      encounter.billing = {
        status: BillingCaptureStatus.FAILED,
        serviceCode: OUTPATIENT_CONSULTATION_SERVICE_CODE,
        error:
          error?.message ||
          'Unable to capture the outpatient consultation charge.',
      };

      await encounter.save();
    }

    return this.getEncounterById(encounterId, hospitalId);
  }

  public async completeConsultation(
    encounterId: string,
    hospitalId: string,
    input: CompleteConsultationInput,
    completedBy?: string
  ): Promise<IOutpatientDocument | null> {
    const updated = await OutpatientModel.findOneAndUpdate(
      {
        _id: encounterId,
        hospitalId,
      },
      {
        $set: {
          consultationNotes: input.consultationNotes,
          diagnoses: input.diagnoses || [],
          status: ConsultationStatus.COMPLETED,
          consultationEndedAt: new Date(),
        },
      },
      { new: true }
    )
      .lean()
      .exec() as unknown as IOutpatientDocument | null;

    if (!updated) return null;

    // Billing is intentionally attempted after the clinical completion is
    // persisted. A billing/catalogue failure is recorded on the encounter
    // and does not roll back the completed consultation.
    return this.captureBilling(
      encounterId,
      hospitalId,
      completedBy
    );
  }
}

export const outpatientService = new OutpatientService();
