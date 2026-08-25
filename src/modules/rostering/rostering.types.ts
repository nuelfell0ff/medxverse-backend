import { Types } from 'mongoose';

/* =========================================================
   ENUMS
========================================================= */

export enum RosterAreaType {
  DEPARTMENT = 'DEPARTMENT',
  WARD = 'WARD',
  THEATRE = 'THEATRE',
  ICU = 'ICU',
  EMERGENCY = 'EMERGENCY',
  CLINIC_OPD = 'CLINIC_OPD',
  LABORATORY = 'LABORATORY',
  RADIOLOGY = 'RADIOLOGY',
  PHARMACY = 'PHARMACY',
  OTHER = 'OTHER',
}

export enum ShiftType {
  DAY = 'DAY',
  EVENING = 'EVENING',
  NIGHT = 'NIGHT',
  ON_CALL = 'ON_CALL',
  CUSTOM = 'CUSTOM',
}

export enum ShiftStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum RosterStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum AssignmentStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum AttendanceStatus {
  SCHEDULED = 'SCHEDULED',
  PRESENT = 'PRESENT',
  LATE = 'LATE',
  ABSENT = 'ABSENT',
  MISSED_SIGN_OUT = 'MISSED_SIGN_OUT',
}

export enum SwapStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum HandoverStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

export enum AvailabilityStatus {
  AVAILABLE = 'AVAILABLE',
  UNAVAILABLE = 'UNAVAILABLE',
  PREFERRED = 'PREFERRED',
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

/* =========================================================
   STAFF REFERENCE
========================================================= */

export interface StaffReference {
  staffId: Types.ObjectId | string;
}

/* =========================================================
   SHIFT
========================================================= */

export interface IShift {
  _id?: Types.ObjectId;

  rosterId: Types.ObjectId;

  date: Date;

  startTime: string;
  endTime: string;

  shiftType: ShiftType;

  status: ShiftStatus;

  areaType: RosterAreaType;

  departmentId?: Types.ObjectId | string;
  departmentName?: string;

  wardId?: Types.ObjectId | string;
  wardName?: string;

  location?: string;

  requiredStaffCount?: number;

  notes?: string;

  isOpenShift: boolean;

  assignedStaff: IShiftAssignment[];

  createdBy?: Types.ObjectId | string;
  updatedBy?: Types.ObjectId | string;

  createdAt?: Date;
  updatedAt?: Date;
}

/* =========================================================
   SHIFT ASSIGNMENT
========================================================= */

export interface IShiftAssignment {
  _id?: Types.ObjectId;

  staffId: Types.ObjectId | string;

  role?: string;

  status: AssignmentStatus;

  acceptedAt?: Date;

  declinedAt?: Date;

  notes?: string;

  assignedAt?: Date;

  assignedBy?: Types.ObjectId | string;

  attendanceStatus?: AttendanceStatus;
  signedInAt?: Date;
  signedOutAt?: Date;
  attendanceNotes?: string;
  lateByMinutes?: number;
}

/* =========================================================
   ROSTER
========================================================= */

export interface IRoster {
  _id?: Types.ObjectId;

  name: string;

  code?: string;

  description?: string;

  startDate: Date;

  endDate: Date;

  status: RosterStatus;

  areaType: RosterAreaType;

  departmentId?: Types.ObjectId | string;

  departmentName?: string;

  wardId?: Types.ObjectId | string;

  wardName?: string;

  isPublished: boolean;

  publishedAt?: Date;

  publishedBy?: Types.ObjectId | string;

  version: number;

  shifts: IShift[];

  createdBy?: Types.ObjectId | string;

  updatedBy?: Types.ObjectId | string;

  createdAt?: Date;

  updatedAt?: Date;
}

/* =========================================================
   STAFF AVAILABILITY
========================================================= */

export interface IStaffAvailability {
  _id?: Types.ObjectId;

  staffId: Types.ObjectId | string;

  date: Date;

  status: AvailabilityStatus;

  preferredShiftTypes?: ShiftType[];

  availableFrom?: string;

  availableTo?: string;

  notes?: string;

  createdAt?: Date;

  updatedAt?: Date;
}

/* =========================================================
   LEAVE-AWARE SCHEDULING
========================================================= */

export interface IStaffLeave {
  _id?: Types.ObjectId;

  staffId: Types.ObjectId | string;

  startDate: Date;

  endDate: Date;

  status: LeaveStatus;

  reason?: string;

  source?: string;

  createdAt?: Date;

  updatedAt?: Date;
}

/* =========================================================
   SHIFT SWAP
========================================================= */

export interface IShiftSwapRequest {
  _id?: Types.ObjectId;

  shiftId: Types.ObjectId | string;

  requesterStaffId: Types.ObjectId | string;

  replacementStaffId?: Types.ObjectId | string;

  reason?: string;

  status: SwapStatus;

  approvedBy?: Types.ObjectId | string;

  approvedAt?: Date;

  rejectionReason?: string;

  createdAt?: Date;

  updatedAt?: Date;
}

/* =========================================================
   HANDOVER
========================================================= */

export interface IShiftHandover {
  _id?: Types.ObjectId;

  shiftId: Types.ObjectId | string;

  outgoingStaffId: Types.ObjectId | string;

  incomingStaffId?: Types.ObjectId | string;

  status: HandoverStatus;

  summary?: string;

  pendingTasks?: string[];

  importantNotes?: string[];

  completedAt?: Date;

  createdAt?: Date;

  updatedAt?: Date;
}

/* =========================================================
   ROSTER VERSION
========================================================= */

export interface IRosterVersion {
  _id?: Types.ObjectId;

  rosterId: Types.ObjectId | string;

  version: number;

  snapshot: Record<string, unknown>;

  changedBy?: Types.ObjectId | string;

  changeReason?: string;

  createdAt?: Date;
}

/* =========================================================
   REQUEST DTOs
========================================================= */

export interface CreateRosterDto {
  name: string;
  code?: string;
  description?: string;

  startDate: Date | string;
  endDate: Date | string;

  areaType: RosterAreaType;

  departmentId?: string;
  departmentName?: string;

  wardId?: string;
  wardName?: string;
}

export interface UpdateRosterDto {
  name?: string;
  code?: string;
  description?: string;

  startDate?: Date | string;
  endDate?: Date | string;

  areaType?: RosterAreaType;

  departmentId?: string;
  departmentName?: string;

  wardId?: string;
  wardName?: string;
}

export interface CreateShiftDto {
  rosterId: string;

  date: Date | string;

  startTime: string;
  endTime: string;

  shiftType: ShiftType;

  areaType?: RosterAreaType;

  departmentId?: string;
  departmentName?: string;

  wardId?: string;
  wardName?: string;

  location?: string;

  requiredStaffCount?: number;

  notes?: string;

  isOpenShift?: boolean;
}

export interface AssignStaffDto {
  staffId: string;
  role?: string;
  notes?: string;
}

export interface SetAvailabilityDto {
  staffId: string;

  date: Date | string;

  status: AvailabilityStatus;

  preferredShiftTypes?: ShiftType[];

  availableFrom?: string;
  availableTo?: string;

  notes?: string;
}

export interface CreateSwapDto {
  shiftId: string;

  requesterStaffId: string;

  replacementStaffId?: string;

  reason?: string;
}

export interface ApproveSwapDto {
  approved: boolean;

  rejectionReason?: string;
}

export interface CreateHandoverDto {
  shiftId: string;

  outgoingStaffId: string;

  incomingStaffId?: string;

  summary?: string;

  pendingTasks?: string[];

  importantNotes?: string[];
}

export interface SignInDto {
  staffId: string;
  notes?: string;
}

export interface SignOutDto {
  staffId: string;
  notes?: string;
}

export interface AttendanceReportQuery {
  startDate: string;
  endDate: string;
  staffId?: string;
  rosterId?: string;
  areaType?: RosterAreaType;
}