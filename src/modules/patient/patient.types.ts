import { Document, Types } from 'mongoose';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type Genotype = 'AA' | 'AS' | 'SS' | 'AC' | 'SC';
export type InsuranceType = 'SELF_PAY' | 'HMO';

export interface IEmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface IPatient {
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: Gender;
  phoneNumber: string;
  email?: string;
  address?: string;
  bloodGroup?: BloodGroup;
  genotype?: Genotype;
  allergies?: string[];
  chronicConditions?: string[];
  emergencyContact: IEmergencyContact;
  insuranceType: InsuranceType;
  hmoProvider?: Types.ObjectId;
  hmoPolicyNumber?: string;
  organizationId: Types.ObjectId;
  isArchived: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPatientDocument extends IPatient, Document {
  _id: Types.ObjectId;
}

export interface CreatePatientDto {
  firstName: string;
  lastName: string;
  dateOfBirth: string | Date;
  gender: Gender;
  phoneNumber: string;
  email?: string;
  address?: string;
  bloodGroup?: BloodGroup;
  genotype?: Genotype;
  allergies?: string[];
  chronicConditions?: string[];
  emergencyContact: IEmergencyContact;
  insuranceType: InsuranceType;
  hmoProvider?: string;
  hmoPolicyNumber?: string;
}

export interface UpdatePatientDto {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string | Date;
  gender?: Gender;
  phoneNumber?: string;
  email?: string;
  address?: string;
  bloodGroup?: BloodGroup;
  genotype?: Genotype;
  allergies?: string[];
  chronicConditions?: string[];
  emergencyContact?: IEmergencyContact;
  insuranceType?: InsuranceType;
  hmoProvider?: string;
  hmoPolicyNumber?: string;
}

export interface PatientQueryFilters {
  insuranceType?: InsuranceType;
  hmoProvider?: string;
  gender?: Gender;
  search?: string;
  page?: number;
  limit?: number;
}