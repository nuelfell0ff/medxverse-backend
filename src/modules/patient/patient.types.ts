import { Document, Types } from 'mongoose';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum AllergySeverity {
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
}

export enum MedicalHistoryStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  CHRONIC = 'CHRONIC',
}

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type Genotype = 'AA' | 'AS' | 'SS' | 'AC';

export interface IVitals {
  temperature?: number;
  systolicBp?: number;
  diastolicBp?: number;
  pulseRate?: number;
  respiratoryRate?: number;
  spo2?: number;
  weight?: number;
  height?: number;
  recordedBy: Types.ObjectId;
  recordedAt: Date;
}

export interface IAllergy {
  allergen: string;
  reaction: string;
  severity: AllergySeverity;
}

export interface IMedicalHistory {
  condition: string;
  diagnosedDate?: Date;
  status: MedicalHistoryStatus;
  notes?: string;
}

export interface IPatient {
  hospitalId: Types.ObjectId;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: Gender;
  phone: string;
  email?: string;
  address?: string;
  maritalStatus?: string;
  occupation?: string;
  nextOfKin?: string;
  informant?: string;
  bloodGroup?: BloodGroup;
  genotype?: Genotype;
  policyNumber?: string;
  hmoId?: Types.ObjectId;
  vitalsHistory: IVitals[];
  allergies: IAllergy[];
  medicalHistory: IMedicalHistory[];
  isFlagged: boolean;
  flagReason?: string;
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
  maritalStatus?: string;
  occupation: string;
  nextOfKin: string;
  informant?: string;
  bloodGroup?: BloodGroup;
  genotype?: Genotype;
  policyNumber?: string;
  hmoId?: string;
}

export interface AddVitalsDTO {
  temperature?: number;
  systolicBp?: number;
  diastolicBp?: number;
  pulseRate?: number;
  respiratoryRate?: number;
  spo2?: number;
  weight?: number;
  height?: number;
}

export interface GetPatientsQueryDTO {
  search?: string;
  page?: string;
  limit?: string;
}

export interface ClinicalSummaryItem {
  id?: string;
  date?: Date | string;
  title: string;
  status?: string;
  summary?: string;
  details?: Record<string, unknown>;
}

export interface PatientClinicalSummary {
  surgery: ClinicalSummaryItem[];
  radiology: ClinicalSummaryItem[];
  laboratory: ClinicalSummaryItem[];
  pharmacy: ClinicalSummaryItem[];
  outpatient: ClinicalSummaryItem[];
  billing: {
    totalCharges: number;
    totalPaid: number;
    balance: number;
    items: ClinicalSummaryItem[];
  };
}

export interface PatientWithClinicalSummary extends IPatientDocument {
  clinicalSummary: PatientClinicalSummary;
}
