import { Document, Types } from 'mongoose';

export enum SurgeryStatus {
  SCHEDULED = 'SCHEDULED',
  PREPPED = 'PREPPED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  POSTPONED = 'POSTPONED',
  CANCELLED = 'CANCELLED',
}

export enum SurgeryUrgency {
  ELECTIVE = 'ELECTIVE',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY',
}

export enum AnesthesiaType {
  GENERAL = 'GENERAL',
  REGIONAL = 'REGIONAL',
  LOCAL = 'LOCAL',
  SPINAL = 'SPINAL',
  EPIDURAL = 'EPIDURAL',
  SEDATION = 'SEDATION',
  COMBINED = 'COMBINED',
}

export interface ISurgicalTeamMember {
  userId: Types.ObjectId;
  role: string; // e.g., 'Lead Surgeon', 'Assistant Surgeon', 'Anesthesiologist', 'Scrub Nurse', 'Circulating Nurse'
}

export interface ISurgeryProcedure {
  code?: string;
  name: string;
  description?: string;
}

export interface ISurgicalCase {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  otRoomNumber: string;
  urgency: SurgeryUrgency;
  status: SurgeryStatus;
  procedure: ISurgeryProcedure;
  surgicalTeam: ISurgicalTeamMember[];
  anesthesiaType: AnesthesiaType;
  preOpNotes?: string;
  postOpNotes?: string;
  scheduledStartTime: Date;
  scheduledEndTime?: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  createdById: Types.ObjectId;
}

export interface ISurgicalCaseDocument extends ISurgicalCase, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSurgicalCaseInput {
  hospitalId: string;
  patientId: string;
  otRoomNumber: string;
  urgency: SurgeryUrgency;
  procedure: ISurgeryProcedure;
  surgicalTeam: { userId: string; role: string }[];
  anesthesiaType: AnesthesiaType;
  preOpNotes?: string;
  scheduledStartTime: Date;
  scheduledEndTime?: Date;
  createdById: string;
}

export interface UpdateSurgeryStatusInput {
  status: SurgeryStatus;
  actualStartTime?: Date;
  actualEndTime?: Date;
}

export interface UpdateSurgicalTeamInput {
  surgicalTeam: { userId: string; role: string }[];
}

export interface UpdatePostOpNotesInput {
  postOpNotes: string;
}

export interface GetSurgicalCasesQuery {
  page?: number;
  limit?: number;
  status?: SurgeryStatus;
  urgency?: SurgeryUrgency;
  otRoomNumber?: string;
  patientId?: string;
  startDate?: string;
  endDate?: string;
}