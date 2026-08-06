import { Document, Types } from 'mongoose';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum BloodGroup {
  A_POSITIVE = 'A+',
  A_NEGATIVE = 'A-',
  B_POSITIVE = 'B+',
  B_NEGATIVE = 'B-',
  AB_POSITIVE = 'AB+',
  AB_NEGATIVE = 'AB-',
  O_POSITIVE = 'O+',
  O_NEGATIVE = 'O-',
}

export enum PatientCategory {
  SELF_PAY = 'SELF_PAY',
  HMO = 'HMO',
}

export interface IPatient {
  hospitalId: Types.ObjectId;
  mrn: string; // Medical Record Number (e.g., STN-PAT-00001)
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: Gender;
  phone: string;
  email?: string;
  address?: string;
  bloodGroup?: BloodGroup;
  genotype?: string;
  allergies?: string[];

  // HMO Coverage Details
  category: PatientCategory;
  hmoId?: Types.ObjectId; // References an Account of type HMO
  hmoPolicyNumber?: string;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPatientDocument extends IPatient, Document {
  _id: Types.ObjectId;
}

export interface CreatePatientDTO {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  phone: string;
  email?: string;
  address?: string;
  bloodGroup?: BloodGroup;
  genotype?: string;
  allergies?: string[];
  category: PatientCategory;
  hmoId?: string;
  hmoPolicyNumber?: string;
}

export interface UpdatePatientDTO extends Partial<CreatePatientDTO> {
  isActive?: boolean;
}