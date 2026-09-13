import { Document, Types } from 'mongoose';

export enum AppointmentStatus {
  SCHEDULED='SCHEDULED', CHECKED_IN='CHECKED_IN', IN_PROGRESS='IN_PROGRESS',
  COMPLETED='COMPLETED', CANCELLED='CANCELLED', NO_SHOW='NO_SHOW',
}

export enum AppointmentType {
  CONSULTATION='CONSULTATION', FOLLOW_UP='FOLLOW_UP', EMERGENCY='EMERGENCY',
  ROUTINE_CHECKUP='ROUTINE_CHECKUP', SURGERY_PREP='SURGERY_PREP',
}

export enum ReminderChannel { SMS='SMS', PUSH='PUSH', EMAIL='EMAIL' }
export enum ReminderStatus { SCHEDULED='SCHEDULED', SENT='SENT', FAILED='FAILED', CANCELLED='CANCELLED' }
export enum QueueTicketStatus { WAITING='WAITING', CALLED='CALLED', IN_SERVICE='IN_SERVICE', COMPLETED='COMPLETED', CANCELLED='CANCELLED', NO_SHOW='NO_SHOW' }
export enum QueuePriority { ROUTINE='ROUTINE', PRIORITY='PRIORITY', URGENT='URGENT', EMERGENCY='EMERGENCY' }

export interface IAppointment {
  hospitalId: Types.ObjectId; patientId: Types.ObjectId; doctorId: Types.ObjectId;
  department?: string; appointmentDate: Date; startTime: string; endTime?: string;
  durationMinutes: number; type: AppointmentType; status: AppointmentStatus;
  priority: QueuePriority; source: 'PORTAL'|'FRONT_DESK'|'STAFF'|'WALK_IN';
  reason?: string; notes?: string; noShowRiskScore?: number; noShowRiskLevel?: 'LOW'|'MEDIUM'|'HIGH';
  reminderPolicyMinutes?: number[]; occupiedSlotKeys?: string[]; createdAt: Date; updatedAt: Date;
}
export interface IAppointmentDocument extends IAppointment, Document { _id: Types.ObjectId; }

export interface IProviderAvailability { dayOfWeek: number; startTime: string; endTime: string; }
export interface IBlockedTime { startAt: Date; endAt: Date; reason?: string; }
export interface IAppointmentRule { type: AppointmentType; durationMinutes: number; bufferMinutes?: number; }
export interface IQueueRules { appointmentWeight: number; arrivalWeight: number; priorityWeight: number; delayWeight: number; }
export interface IProviderSchedule {
  hospitalId: Types.ObjectId; providerId: Types.ObjectId; department?: string;
  timezone?: string; availability: IProviderAvailability[]; blockedTimes: IBlockedTime[];
  rules: IAppointmentRule[]; queueRules: IQueueRules; reminderMinutes: number[]; active: boolean;
}
export interface IProviderScheduleDocument extends IProviderSchedule, Document { _id: Types.ObjectId; }

export interface IQueueTicket {
  hospitalId: Types.ObjectId; appointmentId?: Types.ObjectId; patientId: Types.ObjectId;
  providerId: Types.ObjectId; department?: string; ticketNumber: string;
  status: QueueTicketStatus; priority: QueuePriority; checkedInAt: Date;
  estimatedAppointmentAt?: Date; calledAt?: Date; completedAt?: Date;
  delayMinutes: number; sequenceScore: number; position: number; notes?: string;
}
export interface IQueueTicketDocument extends IQueueTicket, Document { _id: Types.ObjectId; }

export interface IReminderLog {
  hospitalId: Types.ObjectId; appointmentId: Types.ObjectId; patientId: Types.ObjectId;
  channel: ReminderChannel; scheduledFor: Date; sentAt?: Date; status: ReminderStatus;
  template?: string; error?: string; attempts: number;
}
export interface IReminderLogDocument extends IReminderLog, Document { _id: Types.ObjectId; }

export interface INoShowRiskScore {
  hospitalId: Types.ObjectId; appointmentId: Types.ObjectId; patientId: Types.ObjectId;
  score: number; level: 'LOW'|'MEDIUM'|'HIGH'; factors: string[]; calculatedAt: Date;
}
export interface INoShowRiskScoreDocument extends INoShowRiskScore, Document { _id: Types.ObjectId; }

export interface CreateAppointmentDTO {
  patientId: string; doctorId: string; appointmentDate: string; startTime: string; endTime?: string;
  type: AppointmentType; department?: string; priority?: QueuePriority; reason?: string; notes?: string;
  source?: 'PORTAL'|'FRONT_DESK'|'STAFF'|'WALK_IN'; reminderPolicyMinutes?: number[];
}
export interface RescheduleAppointmentDTO { appointmentDate: string; startTime: string; endTime?: string; }
export interface UpdateAppointmentStatusDTO { status: AppointmentStatus; notes?: string; }
export interface GetAppointmentsQueryDTO {
  patientId?: string; doctorId?: string; department?: string; status?: AppointmentStatus;
  date?: string; page?: string; limit?: string;
}
export interface CreateScheduleDTO {
  providerId: string; department?: string; timezone?: string;
  availability: IProviderAvailability[]; blockedTimes?: IBlockedTime[]; rules?: IAppointmentRule[];
  queueRules?: Partial<IQueueRules>; reminderMinutes?: number[]; active?: boolean;
}
export interface CheckInDTO { priority?: QueuePriority; notes?: string; }
export interface CreateWalkInQueueDTO {
  patientId: string; providerId: string; department?: string; priority?: QueuePriority; notes?: string;
}
export interface QueueQueryDTO { providerId?: string; department?: string; date?: string; }
