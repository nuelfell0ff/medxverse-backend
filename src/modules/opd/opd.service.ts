import { OpdEncounter } from './opd.model.js';
import { Patient } from '../patient/patient.model.js';
import { Staff } from '../staff/staff.model.js';
import { CreateOpdDTO, UpdateOpdDTO, RecordVitalsDTO, OpdStatus } from './opd.types.js';

export class OpdService {
  public static async createEncounter(hospitalId: string, dto: CreateOpdDTO) {
    // Validate Patient belongs to this Hospital
    const patient = await Patient.findOne({ _id: dto.patientId, hospitalId });
    if (!patient) {
      throw new Error('Patient not found under this hospital');
    }

    // Validate Doctor belongs to this Hospital
    const doctor = await Staff.findOne({ _id: dto.doctorId, hospitalId, role: 'DOCTOR' });
    if (!doctor) {
      throw new Error('Doctor not found or staff member is not assigned as a DOCTOR');
    }

    const encounter = await OpdEncounter.create({
      ...dto,
      hospitalId,
      encounterDate: dto.encounterDate ? new Date(dto.encounterDate) : new Date(),
      status: OpdStatus.WAITING,
    });

    return encounter.populate([
      { path: 'patientId', select: 'mrn firstName lastName phone gender dateOfBirth bloodGroup category' },
      { path: 'doctorId', select: 'firstName lastName role department' },
    ]);
  }

  public static async getEncounters(
    hospitalId: string,
    filters: { doctorId?: string; patientId?: string; status?: OpdStatus; date?: string; page?: number; limit?: number }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = { hospitalId };

    if (filters.doctorId) query.doctorId = filters.doctorId;
    if (filters.patientId) query.patientId = filters.patientId;
    if (filters.status) query.status = filters.status;

    if (filters.date) {
      const startOfDay = new Date(filters.date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(filters.date);
      endOfDay.setHours(23, 59, 59, 999);

      query.encounterDate = { $gte: startOfDay, $lte: endOfDay };
    }

    const [encounters, total] = await Promise.all([
      OpdEncounter.find(query)
        .populate('patientId', 'mrn firstName lastName phone gender dateOfBirth bloodGroup category')
        .populate('doctorId', 'firstName lastName role department')
        .sort({ encounterDate: -1 })
        .skip(skip)
        .limit(limit),
      OpdEncounter.countDocuments(query),
    ]);

    return {
      encounters,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    };
  }

  public static async getEncounterById(id: string, hospitalId: string) {
    const encounter = await OpdEncounter.findOne({ _id: id, hospitalId }).populate([
      { path: 'patientId', select: 'mrn firstName lastName phone gender dateOfBirth bloodGroup genotype allergies category hmoPolicyNumber' },
      { path: 'doctorId', select: 'firstName lastName role department licenseNumber' },
    ]);

    if (!encounter) {
      throw new Error('OPD encounter record not found');
    }

    return encounter;
  }

  public static async recordVitals(id: string, hospitalId: string, dto: RecordVitalsDTO) {
    const encounter = await OpdEncounter.findOneAndUpdate(
      { _id: id, hospitalId },
      { $set: { vitals: dto.vitals } },
      { new: true, runValidators: true }
    ).populate([
      { path: 'patientId', select: 'mrn firstName lastName' },
      { path: 'doctorId', select: 'firstName lastName' },
    ]);

    if (!encounter) {
      throw new Error('OPD encounter record not found');
    }

    return encounter;
  }

  public static async updateEncounter(id: string, hospitalId: string, dto: UpdateOpdDTO) {
    const encounter = await OpdEncounter.findOneAndUpdate(
      { _id: id, hospitalId },
      { $set: dto },
      { new: true, runValidators: true }
    ).populate([
      { path: 'patientId', select: 'mrn firstName lastName' },
      { path: 'doctorId', select: 'firstName lastName' },
    ]);

    if (!encounter) {
      throw new Error('OPD encounter record not found');
    }

    return encounter;
  }
}