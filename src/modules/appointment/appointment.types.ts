import { Document, Types } from 'mongoose';

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CHECKED_IN = 'CHECKED_IN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum AppointmentType {
  CONSULTATION = 'CONSULTATION',
  FOLLOW_UP = 'FOLLOW_UP',
  EMERGENCY = 'EMERGENCY',
  ROUTINE_CHECKUP = 'ROUTINE_CHECKUP',
  SURGERY_PREP = 'SURGERY_PREP',
}

export interface IAppointment {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  appointmentDate: Date;
  startTime: string; // HH:mm format (e.g., "09:30")
  endTime?: string;
  type: AppointmentType;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAppointmentDocument extends IAppointment, Document {
  _id: Types.ObjectId;
}

export interface CreateAppointmentDTO {
  patientId: string;
  doctorId: string;
  appointmentDate: string; // ISO String format e.g., "2026-08-10"
  startTime: string;
  endTime?: string;
  type: AppointmentType;
  reason?: string;
  notes?: string;
}

export interface UpdateAppointmentStatusDTO {
  status: AppointmentStatus;
  notes?: string;
}

export interface GetAppointmentsQueryDTO {
  patientId?: string;
  doctorId?: string;
  status?: AppointmentStatus;
  date?: string;
  page?: string;
  limit?: string;
}
