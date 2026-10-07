import { Document, Types } from 'mongoose';

export enum PatientAssignmentRole {
  PRIMARY_PHYSICIAN = 'PRIMARY_PHYSICIAN',
  ATTENDING_PHYSICIAN = 'ATTENDING_PHYSICIAN',
  CONSULTANT = 'CONSULTANT',
  PRIMARY_NURSE = 'PRIMARY_NURSE',
  CARE_TEAM = 'CARE_TEAM',
  PHARMACIST = 'PHARMACIST',
  LAB_TECHNICIAN = 'LAB_TECHNICIAN',
  RADIOLOGIST = 'RADIOLOGIST',
  CARE_COORDINATOR = 'CARE_COORDINATOR',
  OTHER = 'OTHER',
}

export enum PatientAssignmentStatus {
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED',
}

export enum PatientAssignmentSource {
  MANUAL = 'MANUAL',
  APPOINTMENT = 'APPOINTMENT',
  ADMISSION = 'ADMISSION',
  EMERGENCY = 'EMERGENCY',
  REFERRAL = 'REFERRAL',
}

export interface IPatientAssignment {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  staffId: Types.ObjectId;
  role: PatientAssignmentRole;
  status: PatientAssignmentStatus;
  departmentId?: Types.ObjectId;
  departmentName?: string;
  source: PatientAssignmentSource;
  appointmentId?: Types.ObjectId;
  assignedBy?: Types.ObjectId;
  assignedByUserType?: 'STAFF' | 'ACCOUNT';
  startAt: Date;
  endAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPatientAssignmentDocument extends IPatientAssignment, Document {
  _id: Types.ObjectId;
}

export interface CreatePatientAssignmentDTO {
  patientId: string;
  staffId: string;
  role: PatientAssignmentRole;
  departmentId?: string;
  source?: PatientAssignmentSource;
  appointmentId?: string;
  startAt?: string;
  endAt?: string;
  notes?: string;
}

export interface UpdatePatientAssignmentDTO {
  role?: PatientAssignmentRole;
  departmentId?: string;
  status?: PatientAssignmentStatus;
  endAt?: string;
  notes?: string;
}

export interface ListMyPatientsQueryDTO {
  search?: string;
  status?: PatientAssignmentStatus;
  role?: PatientAssignmentRole;
  page?: string;
  limit?: string;
}
