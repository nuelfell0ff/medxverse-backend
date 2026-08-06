import { IpdAdmission } from './ipd.model.js';
import { Patient } from '../patient/patient.model.js';
import { Staff } from '../staff/staff.model.js';
import {
  CreateIpdAdmissionDTO,
  DischargePatientDTO,
  AddProgressNoteDTO,
  UpdateIpdAdmissionDTO,
  IpdStatus,
} from './ipd.types.js';

export class IpdService {
  public static async admitPatient(hospitalId: string, dto: CreateIpdAdmissionDTO) {
    // 1. Verify Patient exists under this hospital
    const patient = await Patient.findOne({ _id: dto.patientId, hospitalId });
    if (!patient) {
      throw new Error('Patient record not found under this hospital');
    }

    // 2. Prevent duplicate active admissions for the same patient
    const existingAdmission = await IpdAdmission.findOne({
      hospitalId,
      patientId: dto.patientId,
      status: IpdStatus.ADMITTED,
    });
    if (existingAdmission) {
      throw new Error('Patient is currently admitted in the IPD ward');
    }

    // 3. Verify Doctor exists under this hospital
    const doctor = await Staff.findOne({ _id: dto.doctorId, hospitalId, role: 'DOCTOR' });
    if (!doctor) {
      throw new Error('Assigned doctor not found');
    }

    // 4. Check if the bed is currently occupied
    const occupiedBed = await IpdAdmission.findOne({
      hospitalId,
      ward: dto.ward,
      bedNumber: dto.bedNumber,
      status: IpdStatus.ADMITTED,
    });

    if (occupiedBed) {
      throw new Error(`Bed ${dto.bedNumber} in ${dto.ward} is currently occupied`);
    }

    const admission = await IpdAdmission.create({
      ...dto,
      hospitalId,
      admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : new Date(),
      status: IpdStatus.ADMITTED,
    });

    return admission.populate([
      { path: 'patientId', select: 'mrn firstName lastName phone gender dateOfBirth bloodGroup category' },
      { path: 'doctorId', select: 'firstName lastName role department' },
    ]);
  }

  public static async getAdmissions(
    hospitalId: string,
    filters: {
      status?: IpdStatus;
      ward?: string;
      doctorId?: string;
      patientId?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = { hospitalId };

    if (filters.status) query.status = filters.status;
    if (filters.ward) query.ward = { $regex: filters.ward, $options: 'i' };
    if (filters.doctorId) query.doctorId = filters.doctorId;
    if (filters.patientId) query.patientId = filters.patientId;

    const [admissions, total] = await Promise.all([
      IpdAdmission.find(query)
        .populate('patientId', 'mrn firstName lastName phone gender dateOfBirth bloodGroup category')
        .populate('doctorId', 'firstName lastName role department')
        .sort({ admissionDate: -1 })
        .skip(skip)
        .limit(limit),
      IpdAdmission.countDocuments(query),
    ]);

    return {
      admissions,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    };
  }

  public static async getAdmissionById(id: string, hospitalId: string) {
    const admission = await IpdAdmission.findOne({ _id: id, hospitalId }).populate([
      { path: 'patientId', select: 'mrn firstName lastName phone gender dateOfBirth bloodGroup genotype allergies category hmoPolicyNumber' },
      { path: 'doctorId', select: 'firstName lastName role department licenseNumber' },
    ]);

    if (!admission) {
      throw new Error('IPD admission record not found');
    }

    return admission;
  }

  public static async dischargePatient(id: string, hospitalId: string, dto: DischargePatientDTO) {
    const admission = await IpdAdmission.findOne({ _id: id, hospitalId });
    if (!admission) {
      throw new Error('IPD admission record not found');
    }

    if (admission.status === IpdStatus.DISCHARGED) {
      throw new Error('Patient has already been discharged');
    }

    admission.status = IpdStatus.DISCHARGED;
    admission.dischargeSummary = dto.dischargeSummary;
    admission.dischargeStatus = dto.dischargeStatus;
    admission.dischargeDate = dto.dischargeDate ? new Date(dto.dischargeDate) : new Date();

    await admission.save();

    return admission.populate([
      { path: 'patientId', select: 'mrn firstName lastName' },
      { path: 'doctorId', select: 'firstName lastName' },
    ]);
  }

  public static async addProgressNote(id: string, hospitalId: string, dto: AddProgressNoteDTO) {
    const admission = await IpdAdmission.findOne({ _id: id, hospitalId });
    if (!admission) {
      throw new Error('IPD admission record not found');
    }

    if (admission.status !== IpdStatus.ADMITTED) {
      throw new Error('Cannot add progress notes to a discharged or cancelled admission');
    }

    admission.progressNotes?.push({
      note: dto.note,
      recordedBy: dto.recordedBy,
      createdAt: new Date(),
    });

    await admission.save();
    return admission;
  }

  public static async updateAdmission(id: string, hospitalId: string, dto: UpdateIpdAdmissionDTO) {
    const admission = await IpdAdmission.findOneAndUpdate(
      { _id: id, hospitalId },
      { $set: dto },
      { new: true, runValidators: true }
    ).populate([
      { path: 'patientId', select: 'mrn firstName lastName' },
      { path: 'doctorId', select: 'firstName lastName' },
    ]);

    if (!admission) {
      throw new Error('IPD admission record not found');
    }

    return admission;
  }
}