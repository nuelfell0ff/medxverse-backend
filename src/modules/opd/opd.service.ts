import { OPDVisit } from './opd.model.js';
import { Patient } from '../patient/patient.model.js';
import {
  CreateOPDVisitDto,
  RecordVitalsDto,
  CompleteConsultationDto,
  OPDQueryFilters,
} from './opd.types.js';
import { ApiError } from '../../utils/ApiError.js';
import { generateOPDVisitNumber } from '../../utils/generator.js';

export class OPDService {
  /**
   * Registers a new OPD Visit/Check-in for a patient
   */
  static async createVisit(dto: CreateOPDVisitDto, organizationId: string) {
    const patient = await Patient.findOne({
      _id: dto.patientId,
      organizationId,
      isArchived: false,
    });

    if (!patient) {
      throw new ApiError(404, 'Patient record not found in this organization.');
    }

    // Check for active existing visit for the patient on the same day
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const activeVisit = await OPDVisit.findOne({
      patientId: dto.patientId,
      organizationId,
      status: { $in: ['QUEUED', 'TRIAGED', 'IN_CONSULTATION'] },
      createdAt: { $gte: startOfDay },
    });

    if (activeVisit) {
      throw new ApiError(400, 'Patient already has an active OPD consultation in progress today.');
    }

    const visitNumber = generateOPDVisitNumber();

    const visit = await OPDVisit.create({
      ...dto,
      visitNumber,
      organizationId,
      status: 'QUEUED',
    });

    return visit.populate([
      { path: 'patientId', select: 'firstName lastName mrn dateOfBirth gender phoneNumber' },
      { path: 'doctorId', select: 'firstName lastName staffCode department' },
    ]);
  }

  /**
   * Records nurse/triage vitals for an OPD visit
   */
  static async recordVitals(
    visitId: string,
    dto: RecordVitalsDto,
    recordedByUserId: string,
    organizationId: string
  ) {
    const visit = await OPDVisit.findOne({ _id: visitId, organizationId });
    if (!visit) {
      throw new ApiError(404, 'OPD visit record not found.');
    }

    if (visit.status === 'COMPLETED' || visit.status === 'CANCELLED') {
      throw new ApiError(400, `Cannot record vitals for a visit with status '${visit.status}'.`);
    }

    let bmi: number | undefined;
    if (dto.weight && dto.height) {
      const heightInMeters = dto.height / 100;
      bmi = parseFloat((dto.weight / (heightInMeters * heightInMeters)).toFixed(2));
    }

    visit.vitals = {
      ...dto,
      bmi,
      recordedBy: recordedByUserId as any,
      recordedAt: new Date(),
    };

    if (visit.status === 'QUEUED') {
      visit.status = 'TRIAGED';
    }

    await visit.save();

    return visit.populate([
      { path: 'patientId', select: 'firstName lastName mrn dateOfBirth gender' },
      { path: 'vitals.recordedBy', select: 'firstName lastName staffCode' },
    ]);
  }

  /**
   * Starts a consultation session with a doctor
   */
  static async startConsultation(visitId: string, doctorId: string, organizationId: string) {
    const visit = await OPDVisit.findOne({ _id: visitId, organizationId });
    if (!visit) {
      throw new ApiError(404, 'OPD visit record not found.');
    }

    if (visit.status === 'COMPLETED' || visit.status === 'CANCELLED') {
      throw new ApiError(400, `Cannot start consultation on a visit that is ${visit.status}.`);
    }

    visit.status = 'IN_CONSULTATION';
    visit.doctorId = doctorId as any;
    visit.consultationStartTime = new Date();

    await visit.save();

    return visit.populate([
      { path: 'patientId', select: 'firstName lastName mrn dateOfBirth gender bloodGroup genotype allergies' },
      { path: 'doctorId', select: 'firstName lastName staffCode department' },
    ]);
  }

  /**
   * Completes consultation, recording doctor's notes, diagnoses, prescriptions, and lab orders
   */
  static async completeConsultation(
    visitId: string,
    dto: CompleteConsultationDto,
    doctorId: string,
    organizationId: string
  ) {
    const visit = await OPDVisit.findOne({ _id: visitId, organizationId });
    if (!visit) {
      throw new ApiError(404, 'OPD visit record not found.');
    }

    if (visit.status !== 'IN_CONSULTATION' && visit.status !== 'TRIAGED') {
      throw new ApiError(400, 'Consultation must be started or triaged before completion.');
    }

    visit.clinicalNotes = dto.clinicalNotes;
    visit.diagnoses = dto.diagnoses || [];
    visit.prescriptions = dto.prescriptions || [];
    visit.labOrders = dto.labOrders || [];
    visit.doctorId = doctorId as any;
    visit.status = 'COMPLETED';
    visit.consultationEndTime = new Date();

    await visit.save();

    return visit.populate([
      { path: 'patientId', select: 'firstName lastName mrn' },
      { path: 'doctorId', select: 'firstName lastName staffCode' },
    ]);
  }

  /**
   * Retrieves active OPD queue with pagination and filters
   */
  static async getQueue(organizationId: string, filters: OPDQueryFilters) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const query: any = { organizationId };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.doctorId) {
      query.doctorId = filters.doctorId;
    }

    if (filters.priority) {
      query.priority = filters.priority;
    }

    if (filters.date) {
      const selectedDate = new Date(filters.date);
      const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));
      query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    const [visits, total] = await Promise.all([
      OPDVisit.find(query)
        .populate('patientId', 'firstName lastName mrn phoneNumber dateOfBirth gender insuranceType')
        .populate('doctorId', 'firstName lastName staffCode')
        .sort({ priority: -1, createdAt: 1 })
        .skip(skip)
        .limit(limit),
      OPDVisit.countDocuments(query),
    ]);

    return {
      visits,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Gets single OPD visit details
   */
  static async getVisitById(visitId: string, organizationId: string) {
    const visit = await OPDVisit.findOne({ _id: visitId, organizationId }).populate([
      { path: 'patientId', select: 'firstName lastName mrn dateOfBirth gender phoneNumber bloodGroup genotype allergies chronicConditions' },
      { path: 'doctorId', select: 'firstName lastName staffCode department' },
      { path: 'vitals.recordedBy', select: 'firstName lastName staffCode' },
    ]);

    if (!visit) {
      throw new ApiError(404, 'OPD visit record not found.');
    }

    return visit;
  }
}