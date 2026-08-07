import { Types } from 'mongoose';
import { EyeExamModel, OpticalPrescriptionModel } from './eye-clinic.model.js';
import {
  CreateEyeExamInput,
  CreateOpticalPrescriptionInput,
  GetEyeExamsQuery,
  GetOpticalPrescriptionsQuery,
  IEyeExamDocument,
  IOpticalPrescriptionDocument,
} from './eye-clinic.types.js';

export class EyeClinicService {
  public async createEyeExam(input: CreateEyeExamInput): Promise<IEyeExamDocument> {
    return EyeExamModel.create({
      ...input,
      hospitalId: new Types.ObjectId(input.hospitalId),
      patientId: new Types.ObjectId(input.patientId),
      examinerId: new Types.ObjectId(input.examinerId),
    });
  }

  public async getEyeExams(
    hospitalId: string,
    query: GetEyeExamsQuery
  ): Promise<{ exams: IEyeExamDocument[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hospitalId };

    if (query.patientId) filter.patientId = query.patientId;
    if (query.examinerId) filter.examinerId = query.examinerId;
    if (query.examType) filter.examType = query.examType;

    const [exams, total] = await Promise.all([
      EyeExamModel.find(filter)
        .populate('patientId', 'firstName lastName mrn dateOfBirth gender')
        .populate('examinerId', 'firstName lastName role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      EyeExamModel.countDocuments(filter),
    ]);

    return {
      exams,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getEyeExamById(
    examId: string,
    hospitalId: string
  ): Promise<IEyeExamDocument | null> {
    return EyeExamModel.findOne({ _id: examId, hospitalId })
      .populate('patientId', 'firstName lastName mrn dateOfBirth gender phone')
      .populate('examinerId', 'firstName lastName role')
      .exec();
  }

  public async createOpticalPrescription(
    input: CreateOpticalPrescriptionInput
  ): Promise<IOpticalPrescriptionDocument> {
    // Inactivate older active prescriptions for this patient of the same type
    await OpticalPrescriptionModel.updateMany(
      {
        hospitalId: new Types.ObjectId(input.hospitalId),
        patientId: new Types.ObjectId(input.patientId),
        prescriptionType: input.prescriptionType,
        isActive: true,
      },
      { $set: { isActive: false } }
    );

    return OpticalPrescriptionModel.create({
      ...input,
      hospitalId: new Types.ObjectId(input.hospitalId),
      patientId: new Types.ObjectId(input.patientId),
      prescribedById: new Types.ObjectId(input.prescribedById),
      examId: input.examId ? new Types.ObjectId(input.examId) : undefined,
      expirationDate: new Date(input.expirationDate),
      isActive: true,
    });
  }

  public async getOpticalPrescriptions(
    hospitalId: string,
    query: GetOpticalPrescriptionsQuery
  ): Promise<{
    prescriptions: IOpticalPrescriptionDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hospitalId };

    if (query.patientId) filter.patientId = query.patientId;
    if (query.prescribedById) filter.prescribedById = query.prescribedById;
    if (query.prescriptionType) filter.prescriptionType = query.prescriptionType;
    if (query.isActive !== undefined) filter.isActive = query.isActive;

    const [prescriptions, total] = await Promise.all([
      OpticalPrescriptionModel.find(filter)
        .populate('patientId', 'firstName lastName mrn dateOfBirth gender')
        .populate('prescribedById', 'firstName lastName role')
        .populate('examId', 'examType createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      OpticalPrescriptionModel.countDocuments(filter),
    ]);

    return {
      prescriptions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getOpticalPrescriptionById(
    prescriptionId: string,
    hospitalId: string
  ): Promise<IOpticalPrescriptionDocument | null> {
    return OpticalPrescriptionModel.findOne({ _id: prescriptionId, hospitalId })
      .populate('patientId', 'firstName lastName mrn dateOfBirth gender phone')
      .populate('prescribedById', 'firstName lastName role')
      .populate('examId')
      .exec();
  }
}

export const eyeClinicService = new EyeClinicService();