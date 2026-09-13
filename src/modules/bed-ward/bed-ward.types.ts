import { Document, Types } from 'mongoose';

export enum BedStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  CLEANING = 'CLEANING',
  BLOCKED = 'BLOCKED',
}

export enum BedStatusEventType {
  CREATED = 'CREATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  ASSIGNED = 'ASSIGNED',
  RELEASED = 'RELEASED',
  BLOCKED = 'BLOCKED',
  UNBLOCKED = 'UNBLOCKED',
  CLEANING_REQUESTED = 'CLEANING_REQUESTED',
  CLEANING_COMPLETED = 'CLEANING_COMPLETED',
}

export enum AssignmentStatus {
  RESERVED = 'RESERVED',
  ACTIVE = 'ACTIVE',
  RELEASED = 'RELEASED',
  CANCELLED = 'CANCELLED',
}

export enum TransferRequestStatus {
  REQUESTED = 'REQUESTED',
  MATCHED = 'MATCHED',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export enum AdmissionRequestSource {
  EMERGENCY = 'EMERGENCY',
  THEATRE = 'THEATRE',
  ICU = 'ICU',
  DIRECT_REFERRAL = 'DIRECT_REFERRAL',
  INTERNAL_TRANSFER = 'INTERNAL_TRANSFER',
  OTHER = 'OTHER',
}

export interface IBedRequirements {
  acuityLevel?: number;
  department?: string;
  bedType?: string;
  isolation?: boolean;
  negativePressure?: boolean;
  oxygen?: boolean;
  cardiacMonitor?: boolean;
  pediatric?: boolean;
  bariatric?: boolean;
  mentalHealthSafeSpace?: boolean;
  gender?: string;
}

export interface IWardDocument extends Document {
  hospitalId: Types.ObjectId;
  code: string;
  name: string;
  department?: string;
  floor?: string;
  building?: string;
  specialty?: string;
  active: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBedDocument extends Document {
  hospitalId: Types.ObjectId;
  wardId: Types.ObjectId;
  bedNumber: string;
  bedType: string;
  status: BedStatus;
  version: number;
  patientId?: Types.ObjectId;
  admissionId?: Types.ObjectId;
  currentAssignmentId?: Types.ObjectId;
  capabilities: Record<string, boolean>;
  supportedAcuityLevels: number[];
  genderRestriction?: string;
  notes?: string;
  lastOccupiedAt?: Date;
  lastReleasedAt?: Date;
  cleaningStartedAt?: Date;
  cleaningCompletedAt?: Date;
  blockedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBedAssignmentDocument extends Document {
  hospitalId: Types.ObjectId;
  bedId: Types.ObjectId;
  wardId: Types.ObjectId;
  patientId?: Types.ObjectId;
  admissionId?: Types.ObjectId;
  source?: AdmissionRequestSource;
  status: AssignmentStatus;
  reservedAt?: Date;
  assignedAt?: Date;
  releasedAt?: Date;
  assignedById: Types.ObjectId;
  releasedById?: Types.ObjectId;
  reason?: string;
  requirements?: IBedRequirements;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBedStatusEventDocument extends Document {
  hospitalId: Types.ObjectId;
  bedId: Types.ObjectId;
  wardId: Types.ObjectId;
  fromStatus?: BedStatus;
  toStatus: BedStatus;
  eventType: BedStatusEventType;
  actorId?: Types.ObjectId;
  reason?: string;
  patientId?: Types.ObjectId;
  assignmentId?: Types.ObjectId;
  occurredAt: Date;
  version: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface ITransferRequestDocument extends Document {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  fromWardId?: Types.ObjectId;
  fromBedId?: Types.ObjectId;
  toWardId?: Types.ObjectId;
  toBedId?: Types.ObjectId;
  requirements: IBedRequirements;
  source: AdmissionRequestSource;
  status: TransferRequestStatus;
  requestedById: Types.ObjectId;
  matchedAt?: Date;
  acceptedAt?: Date;
  completedAt?: Date;
  reason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOccupancyForecastDocument extends Document {
  hospitalId: Types.ObjectId;
  wardId: Types.ObjectId;
  forecastDate: Date;
  horizonDays: number;
  projectedOccupied: number;
  projectedAvailable: number;
  projectedOccupancyRate: number;
  expectedAdmissions: number;
  expectedDischarges: number;
  confidence: number;
  methodology: string;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWardInput {
  hospitalId: string;
  code: string;
  name: string;
  department?: string;
  floor?: string;
  building?: string;
  specialty?: string;
  notes?: string;
}

export interface CreateBedInput {
  hospitalId: string;
  wardId: string;
  bedNumber: string;
  bedType: string;
  capabilities?: Record<string, boolean>;
  supportedAcuityLevels?: number[];
  genderRestriction?: string;
  notes?: string;
}

export interface BedMatchRequest {
  hospitalId: string;
  patientId?: string;
  requirements: IBedRequirements;
  source: AdmissionRequestSource;
  requestedById: string;
  admissionId?: string;
}

export interface ConfirmBedAssignmentInput {
  bedId: string;
  patientId?: string;
  admissionId?: string;
  requestedById: string;
  source?: AdmissionRequestSource;
  reason?: string;
  requirements?: IBedRequirements;
}

export interface TransitionBedInput {
  status: BedStatus;
  actorId: string;
  reason?: string;
  patientId?: string;
  assignmentId?: string;
  metadata?: Record<string, unknown>;
  expectedVersion?: number;
}

export interface CompleteCleaningInput {
  actorId: string;
  expectedVersion?: number;
  notes?: string;
}

export interface CreateTransferRequestInput {
  hospitalId: string;
  patientId: string;
  fromWardId?: string;
  fromBedId?: string;
  requirements: IBedRequirements;
  source: AdmissionRequestSource;
  requestedById: string;
  reason?: string;
  notes?: string;
}

export interface GetBedQuery {
  wardId?: string;
  status?: BedStatus;
  bedType?: string;
  department?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface WardDashboardItem {
  wardId: string;
  code: string;
  name: string;
  department?: string;
  totalBeds: number;
  occupied: number;
  available: number;
  cleaning: number;
  blocked: number;
  occupancyRate: number;
  projectedOccupied24h?: number;
  projectedAvailable24h?: number;
}

export interface BedMatchSuggestion {
  bed: IBedDocument;
  ward: IWardDocument;
  score: number;
  reasons: string[];
  warnings: string[];
}

export interface HospitalCapacityDashboard {
  hospitalId: string;
  totalBeds: number;
  occupied: number;
  available: number;
  cleaning: number;
  blocked: number;
  occupancyRate: number;
  wards: WardDashboardItem[];
  generatedAt: string;
}

export interface BedBoardEvent {
  hospitalId: string;
  event: string;
  bedId?: string;
  wardId?: string;
  patientId?: string;
  occurredAt: string;
  version?: number;
}
