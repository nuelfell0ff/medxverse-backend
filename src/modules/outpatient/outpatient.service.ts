import { OutpatientModel } from './outpatient.model.js';
import {
  CreateOutpatientInput,
  GetOutpatientQuery,
  IOutpatientDocument,
  ConsultationStatus,
  UpdateVitalsInput,
  CompleteConsultationInput,
} from './outpatient.types.js';

export class OutpatientService {
  public async createEncounter(input: CreateOutpatientInput): Promise<IOutpatientDocument> {
    return OutpatientModel.create({
      ...input,
      status: ConsultationStatus.IN_QUEUE,
      queuedAt: new Date(),
    });
  }

  public async getQueue(
    hospitalId: string,
    query: GetOutpatientQuery
  ): Promise<{ encounters: IOutpatientDocument[]; total: number; page: number; totalPages: number }> {
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
    return OutpatientModel.findOne({ _id: encounterId, hospitalId })
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
        ? parseFloat((input.vitalSigns.weight / Math.pow(input.vitalSigns.height / 100, 2)).toFixed(2))
        : undefined;

    return OutpatientModel.findOneAndUpdate(
      { _id: encounterId, hospitalId },
      {
        $set: {
          vitalSigns: { ...input.vitalSigns, bmi },
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
      { _id: encounterId, hospitalId },
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

  public async completeConsultation(
    encounterId: string,
    hospitalId: string,
    input: CompleteConsultationInput
  ): Promise<IOutpatientDocument | null> {
    return OutpatientModel.findOneAndUpdate(
      { _id: encounterId, hospitalId },
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
      .populate('patientId', 'firstName lastName mrn gender dateOfBirth phone')
      .populate('doctorId', 'firstName lastName role department')
      .lean()
      .exec() as unknown as IOutpatientDocument | null;
  }
}

export const outpatientService = new OutpatientService();
