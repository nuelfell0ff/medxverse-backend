import { Types } from 'mongoose';
import { ConsultationModel } from './consultation.model.js';
import {
  CreateConsultationDTO,
  UpdateConsultationDTO,
  GetConsultationsQueryDTO,
  IConsultationDocument,
  ConsultationStatus,
} from './consultation.types.js';

export class ConsultationService {
  static async createConsultation(
    hospitalId: string,
    doctorId: string,
    dto: CreateConsultationDTO
  ): Promise<IConsultationDocument> {
    const consultation = await ConsultationModel.create({
      hospitalId: new Types.ObjectId(hospitalId),
      patientId: new Types.ObjectId(dto.patientId),
      doctorId: new Types.ObjectId(doctorId),
      appointmentId: dto.appointmentId ? new Types.ObjectId(dto.appointmentId) : undefined,
      encounterType: dto.encounterType,
      chiefComplaint: dto.chiefComplaint,
      historyOfPresentIllness: dto.historyOfPresentIllness,
      physicalExamination: dto.physicalExamination,
      diagnoses: dto.diagnoses || [],
      treatmentPlan: dto.treatmentPlan,
      prescriptions: dto.prescriptions || [],
      labOrders: dto.labOrders || [],
      followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
    });

    return consultation.populate([
      { path: 'patientId', select: 'firstName lastName mrn dateOfBirth gender bloodGroup genotype' },
      { path: 'doctorId', select: 'firstName lastName email department' },
    ]);
  }

  static async getConsultations(hospitalId: string, query: GetConsultationsQueryDTO) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hospitalId };

    if (query.patientId) {
      filter.patientId = new Types.ObjectId(query.patientId);
    }

    if (query.doctorId) {
      filter.doctorId = new Types.ObjectId(query.doctorId);
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.encounterType) {
      filter.encounterType = query.encounterType;
    }

    const [consultations, total] = await Promise.all([
      ConsultationModel.find(filter)
        .populate('patientId', 'firstName lastName mrn dateOfBirth gender')
        .populate('doctorId', 'firstName lastName email department')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ConsultationModel.countDocuments(filter),
    ]);

    return {
      consultations,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  static async getConsultationById(
    hospitalId: string,
    consultationId: string
  ): Promise<IConsultationDocument> {
    const consultation = await ConsultationModel.findOne({
      _id: consultationId,
      hospitalId,
    }).populate([
      { path: 'patientId', select: 'firstName lastName mrn dateOfBirth gender bloodGroup genotype allergies medicalHistory' },
      { path: 'doctorId', select: 'firstName lastName email department' },
      { path: 'appointmentId', select: 'appointmentDate startTime type' },
    ]);

    if (!consultation) {
      const error = new Error('Consultation record not found.') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    return consultation;
  }

  static async updateConsultation(
    hospitalId: string,
    consultationId: string,
    dto: UpdateConsultationDTO
  ): Promise<IConsultationDocument> {
    const consultation = await this.getConsultationById(hospitalId, consultationId);

    if (dto.chiefComplaint !== undefined) consultation.chiefComplaint = dto.chiefComplaint;
    if (dto.historyOfPresentIllness !== undefined) consultation.historyOfPresentIllness = dto.historyOfPresentIllness;
    if (dto.physicalExamination !== undefined) consultation.physicalExamination = dto.physicalExamination;
    if (dto.diagnoses !== undefined) consultation.diagnoses = dto.diagnoses;
    if (dto.treatmentPlan !== undefined) consultation.treatmentPlan = dto.treatmentPlan;
    if (dto.prescriptions !== undefined) consultation.prescriptions = dto.prescriptions;
    if (dto.labOrders !== undefined) consultation.labOrders = dto.labOrders;
    if (dto.followUpDate !== undefined) consultation.followUpDate = new Date(dto.followUpDate);

    if (dto.status !== undefined) {
      consultation.status = dto.status;
      if (dto.status === ConsultationStatus.COMPLETED && !consultation.completedAt) {
        consultation.completedAt = new Date();
      }
    }

    await consultation.save();
    return consultation;
  }
}