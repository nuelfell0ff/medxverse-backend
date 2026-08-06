import { Patient } from './patient.model.js';
import { Account } from '../auth/auth.model.js';
import { CreatePatientDTO, UpdatePatientDTO } from './patient.types.js';

export class PatientService {
  private static async generateMRN(hospitalId: string): Promise<string> {
    const hospital = await Account.findById(hospitalId);
    const prefix = hospital?.code ? hospital.code.toUpperCase() : 'MED';
    
    const count = await Patient.countDocuments({ hospitalId });
    const sequenceNumber = String(count + 1).padStart(5, '0');
    
    return `${prefix}-PAT-${sequenceNumber}`;
  }

  public static async createPatient(hospitalId: string, dto: CreatePatientDTO) {
    if (dto.category === 'HMO' && !dto.hmoId) {
      throw new Error('HMO Account ID is required for HMO category patients');
    }

    const mrn = await this.generateMRN(hospitalId);

    const patient = await Patient.create({
      ...dto,
      hospitalId,
      mrn,
      dateOfBirth: new Date(dto.dateOfBirth),
    });

    return patient;
  }

  public static async getPatients(
    hospitalId: string,
    filters: { search?: string; category?: string; page?: number; limit?: number }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = { hospitalId, isActive: true };

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.search) {
      query.$or = [
        { mrn: { $regex: filters.search, $options: 'i' } },
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } },
        { phone: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [patients, total] = await Promise.all([
      Patient.find(query)
        .populate('hmoId', 'name code email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Patient.countDocuments(query),
    ]);

    return {
      patients,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    };
  }

  public static async getPatientById(patientId: string, hospitalId: string) {
    const patient = await Patient.findOne({ _id: patientId, hospitalId }).populate(
      'hmoId',
      'name code email'
    );
    if (!patient) {
      throw new Error('Patient record not found');
    }
    return patient;
  }

  public static async updatePatient(
    patientId: string,
    hospitalId: string,
    dto: UpdatePatientDTO
  ) {
    const updateData: any = { ...dto };
    if (dto.dateOfBirth) {
      updateData.dateOfBirth = new Date(dto.dateOfBirth);
    }

    const patient = await Patient.findOneAndUpdate(
      { _id: patientId, hospitalId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!patient) {
      throw new Error('Patient record not found');
    }

    return patient;
  }
}