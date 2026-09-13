import { Document, Types } from 'mongoose';

export enum EDVisitStatus {
  ARRIVED = 'ARRIVED',
  TRIAGED = 'TRIAGED',
  WAITING_FOR_BAY = 'WAITING_FOR_BAY',
  IN_BAY = 'IN_BAY',
  IN_TREATMENT = 'IN_TREATMENT',
  AWAITING_RESULTS = 'AWAITING_RESULTS',
  READY_FOR_DISPOSITION = 'READY_FOR_DISPOSITION',
  ADMITTED = 'ADMITTED',
  DISCHARGED = 'DISCHARGED',
  TRANSFERRED = 'TRANSFERRED',
  DECEASED = 'DECEASED',
  LEFT_WITHOUT_BEING_SEEN = 'LEFT_WITHOUT_BEING_SEEN',
  LEFT_AGAINST_MEDICAL_ADVICE = 'LEFT_AGAINST_MEDICAL_ADVICE',
}

export enum TriageScale {
  ESI = 'ESI',
  CTAS = 'CTAS',
}

export enum ArrivalMode {
  AMBULANCE = 'AMBULANCE',
  WALK_IN = 'WALK_IN',
  POLICE = 'POLICE',
  REFERRAL = 'REFERRAL',
  OTHER = 'OTHER',
}

export enum AcuityLevel {
  LEVEL_1 = 1,
  LEVEL_2 = 2,
  LEVEL_3 = 3,
  LEVEL_4 = 4,
  LEVEL_5 = 5,
}

export enum TraumaType {
  NONE = 'NONE',
  BLUNT = 'BLUNT',
  PENETRATING = 'PENETRATING',
  THERMAL = 'THERMAL',
  CHEMICAL = 'CHEMICAL',
  MULTI_SYSTEM = 'MULTI_SYSTEM',
}

export enum BayAssignmentStatus {
  ASSIGNED = 'ASSIGNED',
  RELEASED = 'RELEASED',
  CANCELLED = 'CANCELLED',
}

export enum EDBayStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  CLEANING = 'CLEANING',
  MAINTENANCE = 'MAINTENANCE',
  RESERVED = 'RESERVED',
}

export enum EDOrderType {
  LAB = 'LAB',
  IMAGING = 'IMAGING',
  MEDICATION = 'MEDICATION',
  OTHER = 'OTHER',
}

export enum EDOrderStatus {
  ORDERED = 'ORDERED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  RESULTED = 'RESULTED',
}

export enum DispositionType {
  ADMIT = 'ADMIT',
  DISCHARGE = 'DISCHARGE',
  TRANSFER = 'TRANSFER',
  DECEASED = 'DECEASED',
  LEFT_WITHOUT_BEING_SEEN = 'LEFT_WITHOUT_BEING_SEEN',
  LEFT_AGAINST_MEDICAL_ADVICE = 'LEFT_AGAINST_MEDICAL_ADVICE',
}

export enum WorkflowStatus {
  PENDING = 'PENDING',
  TRIGGERED = 'TRIGGERED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface IEDVitals {
  heartRateBpm?: number;
  systolicBpMmHg?: number;
  diastolicBpMmHg?: number;
  respiratoryRateBpm?: number;
  oxygenSaturationPct?: number;
  temperatureCelsius?: number;
  glasgowComaScale?: number;
  painScale?: number;
  bloodGlucoseMmolL?: number;
}

export interface IResourceNeeds {
  resuscitation?: boolean;
  cardiacMonitor?: boolean;
  oxygen?: boolean;
  isolation?: boolean;
  negativePressure?: boolean;
  bariatric?: boolean;
  pediatric?: boolean;
  mentalHealthSafeSpace?: boolean;
}

export interface IStatusTransition {
  from?: EDVisitStatus;
  to: EDVisitStatus;
  changedAt: Date;
  changedBy: Types.ObjectId;
  reason?: string;
}

export interface IDownstreamWorkflowEvent {
  workflow: 'BED_MANAGEMENT' | 'DISCHARGE_PLANNING' | 'REFERRAL';
  status: WorkflowStatus;
  triggeredAt?: Date;
  completedAt?: Date;
  referenceId?: string;
  errorMessage?: string;
}

export interface IEDVisit {
  hospitalId: Types.ObjectId;
  patientId?: Types.ObjectId;
  visitNumber: string;
  isUnidentified: boolean;
  temporaryIdentifier?: string;
  arrivalAt: Date;
  arrivalMode: ArrivalMode;
  chiefComplaint: string;
  traumaType: TraumaType;
  status: EDVisitStatus;
  currentAcuityLevel?: AcuityLevel;
  currentTriageAssessmentId?: Types.ObjectId;
  currentBayAssignmentId?: Types.ObjectId;
  attendingClinicianId?: Types.ObjectId;
  resourceNeeds: IResourceNeeds;
  priorityScore: number;
  statusTransitions: IStatusTransition[];
  downstreamWorkflows: IDownstreamWorkflowEvent[];
  notes?: string;
  closedAt?: Date;
}

export interface IEDVisitDocument extends IEDVisit, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface ITriageAssessment {
  hospitalId: Types.ObjectId;
  visitId: Types.ObjectId;
  patientId?: Types.ObjectId;
  scale: TriageScale;
  acuityLevel: AcuityLevel;
  chiefComplaint: string;
  vitals?: IEDVitals;
  resourceNeeds: IResourceNeeds;
  assessedById: Types.ObjectId;
  assessedAt: Date;
  isReassessment: boolean;
  notes?: string;
}

export interface ITriageAssessmentDocument extends ITriageAssessment, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IEDBay {
  hospitalId: Types.ObjectId;
  bayCode: string;
  name?: string;
  zone?: string;
  type?: string;
  capacity: number;
  occupiedCount: number;
  status: EDBayStatus;
  supportedAcuityLevels: AcuityLevel[];
  resourceCapabilities: IResourceNeeds;
  notes?: string;
}

export interface IEDBayDocument extends IEDBay, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IBayAssignment {
  hospitalId: Types.ObjectId;
  visitId: Types.ObjectId;
  patientId?: Types.ObjectId;
  bayId?: Types.ObjectId;
  bayCode: string;
  assignedById: Types.ObjectId;
  assignedAt: Date;
  releasedAt?: Date;
  status: BayAssignmentStatus;
  reason?: string;
}

export interface IBayAssignmentDocument extends IBayAssignment, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IEDOrder {
  hospitalId: Types.ObjectId;
  visitId: Types.ObjectId;
  patientId?: Types.ObjectId;
  type: EDOrderType;
  name: string;
  status: EDOrderStatus;
  sourceSystem?: string;
  sourceRecordId?: string;
  orderedById: Types.ObjectId;
  orderedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  resultSummary?: string;
  notes?: string;
}

export interface IEDOrderDocument extends IEDOrder, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IDispositionRecord {
  hospitalId: Types.ObjectId;
  visitId: Types.ObjectId;
  patientId?: Types.ObjectId;
  disposition: DispositionType;
  decidedById: Types.ObjectId;
  decidedAt: Date;
  notes?: string;
  wardId?: Types.ObjectId;
  transferFacility?: string;
  workflowStatus: WorkflowStatus;
  workflowReferenceId?: string;
  workflowError?: string;
}

export interface IDispositionRecordDocument extends IDispositionRecord, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEDVisitInput {
  hospitalId: string;
  patientId?: string;
  isUnidentified?: boolean;
  temporaryIdentifier?: string;
  arrivalMode: ArrivalMode;
  chiefComplaint: string;
  traumaType?: TraumaType;
  attendingClinicianId?: string;
  resourceNeeds?: IResourceNeeds;
  notes?: string;
  actorId: string;
}

export interface CreateTriageInput {
  scale: TriageScale;
  acuityLevel: AcuityLevel;
  chiefComplaint?: string;
  vitals?: IEDVitals;
  resourceNeeds?: IResourceNeeds;
  notes?: string;
}

export interface CreateBayInput {
  bayCode: string;
  name?: string;
  zone?: string;
  type?: string;
  capacity?: number;
  supportedAcuityLevels?: AcuityLevel[];
  resourceCapabilities?: IResourceNeeds;
  notes?: string;
}

export interface AssignBayInput {
  bayId?: string;
  bayCode?: string;
  reason?: string;
}

export interface CreateEDOrderInput {
  type: EDOrderType;
  name: string;
  sourceSystem?: string;
  sourceRecordId?: string;
  notes?: string;
}

export interface UpdateEDOrderInput {
  status: EDOrderStatus;
  resultSummary?: string;
  notes?: string;
}

export interface UpdateEDStatusInput {
  status: EDVisitStatus;
  reason?: string;
}

export interface CreateDispositionInput {
  disposition: DispositionType;
  notes?: string;
  wardId?: string;
  transferFacility?: string;
}

export interface GetEDBoardQuery {
  status?: EDVisitStatus;
  acuityLevel?: AcuityLevel;
  zone?: string;
  page?: number;
  limit?: number;
}

export interface GetEDVisitsQuery extends GetEDBoardQuery {
  patientId?: string;
  visitNumber?: string;
}

export interface IEDBoardItem {
  visit: IEDVisitDocument;
  patient?: unknown;
  triage?: ITriageAssessmentDocument | null;
  bay?: IBayAssignmentDocument | null;
  orders: IEDOrderDocument[];
  waitTimeMinutes: number;
  priorityScore: number;
}
