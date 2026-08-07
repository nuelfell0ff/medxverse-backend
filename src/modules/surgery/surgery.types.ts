import { Document, Types } from 'mongoose';

export enum SurgeryStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  POSTPONED = 'POSTPONED',
}

export enum UrgencyLevel {
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
}

export interface ISurgicalTeamMember {
  userId: Types.ObjectId;
  role: 'PRIMARY_SURGEON' | 'ASSISTING_SURGEON' | 'ANAESTHETIST' | 'SCRUB_NURSE' | 'CIRCULATING_NURSE';
  notes?: string;
}

export interface ISurgicalChecklist {
  signInCompleted: boolean;
  signInCompletedAt?: Date;
  timeOutCompleted: boolean;
  timeOutCompletedAt?: Date;
  signOutCompleted: boolean;
  signOutCompletedAt?: Date;
  notes?: string;
}

export interface ISurgeryCase {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  leadSurgeonId: Types.ObjectId;
  theatreId: string;
  procedureName: string;
  icdCode?: string;
  urgency: UrgencyLevel;
  status: SurgeryStatus;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  anesthesiaType: AnesthesiaType;
  surgicalTeam: ISurgicalTeamMember[];
  checklist: ISurgicalChecklist;
  anesthesiaNotes?: string;
  operationNotes?: string;
  postOpNotes?: string;
  cancellationReason?: string;
}

export interface ISurgeryCaseDocument extends ISurgeryCase, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSurgeryCaseInput {
  hospitalId: string;
  patientId: string;
  leadSurgeonId: string;
  theatreId: string;
  procedureName: string;
  icdCode?: string;
  urgency?: UrgencyLevel;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  anesthesiaType: AnesthesiaType;
  surgicalTeam?: {
    userId: string;
    role: 'PRIMARY_SURGEON' | 'ASSISTING_SURGEON' | 'ANAESTHETIST' | 'SCRUB_NURSE' | 'CIRCULATING_NURSE';
    notes?: string;
  }[];
}

export interface UpdateChecklistInput {
  signInCompleted?: boolean;
  timeOutCompleted?: boolean;
  signOutCompleted?: boolean;
  notes?: string;
}

export interface CompleteSurgeryInput {
  anesthesiaNotes?: string;
  operationNotes?: string;
  postOpNotes?: string;
}

export interface GetSurgeryCasesQuery {
  page?: number;
  limit?: number;
  status?: SurgeryStatus;
  theatreId?: string;
  leadSurgeonId?: string;
  patientId?: string;
  date?: string;
}