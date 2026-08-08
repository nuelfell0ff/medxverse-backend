import { PatientModel } from './patient.model.js';
import {
  CreatePatientDTO,
  AddVitalsDTO,
  GetPatientsQueryDTO,
  IPatientDocument,
  Gender,
} from './patient.types.js';

export class PatientService {
  private static generateMRN(): string {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `MRN-${randomNum}`;
  }

  static async registerPatient(hospitalId: string, dto: CreatePatientDTO): Promise<IPatientDocument> {
    let mrn = this.generateMRN();
    let exists = await PatientModel.findOne({ mrn });

    while (exists) {
      mrn = this.generateMRN();
      exists = await PatientModel.findOne({ mrn });
    }

    // Clean up dto to prevent Mongoose schema validation / casting failures
    const sanitizedData: Record<string, any> = { ...dto };

    // 1. Remove empty string values for optional fields
    Object.keys(sanitizedData).forEach((key) => {
      if (sanitizedData[key] === '' || sanitizedData[key] === null) {
        delete sanitizedData[key];
      }
    });

    // 2. Ensure gender matches uppercase Enum ('MALE' | 'FEMALE' | 'OTHER')
    if (sanitizedData.gender) {
      sanitizedData.gender = sanitizedData.gender.toUpperCase() as Gender;
    }

    // 3. Ensure dateOfBirth is valid
    const dob = new Date(sanitizedData.dateOfBirth);
    if (isNaN(dob.getTime())) {
      throw new Error('Invalid date of birth provided.');
    }

    const patient = await PatientModel.create({
      ...sanitizedData,
      hospitalId,
      mrn,
      dateOfBirth: dob,
    });

    return patient;
  }

  static async getPatients(hospitalId: string, query: GetPatientsQueryDTO) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hospitalId };

    if (query.search) {
      filter.$or = [
        { firstName: { $regex: query.search, $options: 'i' } },
        { lastName: { $regex: query.search, $options: 'i' } },
        { mrn: { $regex: query.search, $options: 'i' } },
        { phone: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [patients, total] = await Promise.all([
      PatientModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      PatientModel.countDocuments(filter),
    ]);

    return {
      patients,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  static async getPatientById(hospitalId: string, patientId: string): Promise<IPatientDocument> {
    const patient = await PatientModel.findOne({ _id: patientId, hospitalId });
    if (!patient) {
      const error = new Error('Patient record not found.') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }
    return patient;
  }

  static async addVitals(
    hospitalId: string,
    patientId: string,
    userId: string,
    dto: AddVitalsDTO
  ): Promise<IPatientDocument> {
    const patient = await this.getPatientById(hospitalId, patientId);

    patient.vitalsHistory.push({
      ...dto,
      recordedBy: userId as unknown as import('mongoose').Types.ObjectId,
      recordedAt: new Date(),
    });

    await patient.save();
    return patient;
  }
}
