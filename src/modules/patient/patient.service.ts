import { Patient } from './patient.model.js';
import { CreatePatientDto, UpdatePatientDto, PatientQueryFilters } from './patient.types.js';
import { ApiError } from '../../utils/ApiError.js';
import { generateMRN } from '../../utils/generator.js';

export class PatientService {
  /**
   * Registers a new patient record with auto-generated MRN
   */
  static async createPatient(dto: CreatePatientDto, organizationId: string) {
    if (dto.insuranceType === 'HMO' && (!dto.hmoProvider || !dto.hmoPolicyNumber)) {
      throw new ApiError(400, 'HMO Provider and Policy Number are required for HMO insured patients.');
    }

    let mrn = generateMRN();
    let isUnique = false;

    // Ensure MRN collision safety
    while (!isUnique) {
      const existing = await Patient.findOne({ mrn });
      if (!existing) {
        isUnique = true;
      } else {
        mrn = generateMRN();
      }
    }

    const patient = await Patient.create({
      ...dto,
      mrn,
      organizationId,
    });

    return patient;
  }

  /**
   * Retrieves paginated list of patients with search and filters
   */
  static async getPatients(organizationId: string, filters: PatientQueryFilters) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const query: any = { organizationId, isArchived: false };

    if (filters.insuranceType) query.insuranceType = filters.insuranceType;
    if (filters.hmoProvider) query.hmoProvider = filters.hmoProvider;
    if (filters.gender) query.gender = filters.gender;

    if (filters.search) {
      query.$or = [
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } },
        { mrn: { $regex: filters.search, $options: 'i' } },
        { phoneNumber: { $regex: filters.search, $options: 'i' } },
        { hmoPolicyNumber: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [patients, total] = await Promise.all([
      Patient.find(query)
        .populate('hmoProvider', 'name code')
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
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves a single patient by MongoDB ID
   */
  static async getPatientById(id: string, organizationId: string) {
    const patient = await Patient.findOne({ _id: id, organizationId, isArchived: false }).populate(
      'hmoProvider',
      'name code email phone'
    );

    if (!patient) {
      throw new ApiError(404, 'Patient record not found.');
    }

    return patient;
  }

  /**
   * Retrieves a single patient by Medical Record Number (MRN)
   */
  static async getPatientByMRN(mrn: string, organizationId: string) {
    const patient = await Patient.findOne({
      mrn: mrn.toUpperCase(),
      organizationId,
      isArchived: false,
    }).populate('hmoProvider', 'name code email phone');

    if (!patient) {
      throw new ApiError(404, `No patient found with MRN: ${mrn}`);
    }

    return patient;
  }

  /**
   * Updates patient details
   */
  static async updatePatient(id: string, dto: UpdatePatientDto, organizationId: string) {
    if (dto.insuranceType === 'HMO' && (!dto.hmoProvider || !dto.hmoPolicyNumber)) {
      throw new ApiError(400, 'HMO Provider and Policy Number are required for HMO insured patients.');
    }

    const patient = await Patient.findOneAndUpdate(
      { _id: id, organizationId, isArchived: false },
      { $set: dto },
      { new: true, runValidators: true }
    ).populate('hmoProvider', 'name code');

    if (!patient) {
      throw new ApiError(404, 'Patient record not found.');
    }

    return patient;
  }

  /**
   * Soft deletes / archives a patient record
   */
  static async archivePatient(id: string, organizationId: string) {
    const patient = await Patient.findOneAndUpdate(
      { _id: id, organizationId },
      { $set: { isArchived: true } },
      { new: true }
    );

    if (!patient) {
      throw new ApiError(404, 'Patient record not found.');
    }

    return { id: patient._id, mrn: patient.mrn, isArchived: true };
  }
}