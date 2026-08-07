import { Document, Types } from 'mongoose';

export enum BloodGroup {
  A_POSITIVE = 'A_POSITIVE',
  A_NEGATIVE = 'A_NEGATIVE',
  B_POSITIVE = 'B_POSITIVE',
  B_NEGATIVE = 'B_NEGATIVE',
  AB_POSITIVE = 'AB_POSITIVE',
  AB_NEGATIVE = 'AB_NEGATIVE',
  O_POSITIVE = 'O_POSITIVE',
  O_NEGATIVE = 'O_NEGATIVE',
}

export enum BloodComponentType {
  WHOLE_BLOOD = 'WHOLE_BLOOD',
  PACKED_RED_BLOOD_CELLS = 'PACKED_RED_BLOOD_CELLS',
  FRESH_FROZEN_PLASMA = 'FRESH_FROZEN_PLASMA',
  PLATELETS = 'PLATELETS',
  CRYOPRECIPITATE = 'CRYOPRECIPITATE',
}

export enum BloodUnitStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  TRANSFUSED = 'TRANSFUSED',
  EXPIRED = 'EXPIRED',
  DISCARDED = 'DISCARDED',
  QUARANTINED = 'QUARANTINED',
}

export enum TransfusionRequestStatus {
  PENDING = 'PENDING',
  CROSSMATCHED = 'CROSSMATCHED',
  APPROVED = 'APPROVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export enum TransfusionUrgency {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY',
}

export enum CrossmatchResult {
  NOT_DONE = 'NOT_DONE',
  COMPATIBLE = 'COMPATIBLE',
  INCOMPATIBLE = 'INCOMPATIBLE',
}

export interface IBloodUnit {
  hospitalId: Types.ObjectId;
  donorId?: Types.ObjectId;
  donorCode?: string;
  unitNumber: string;
  bloodGroup: BloodGroup;
  componentType: BloodComponentType;
  volumeMl: number;
  collectionDate: Date;
  expiryDate: Date;
  status: BloodUnitStatus;
  storageLocation?: string;
  notes?: string;
}

export interface IBloodUnitDocument extends IBloodUnit, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface ITransfusionRequest {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  requestedById: Types.ObjectId;
  bloodGroup: BloodGroup;
  componentType: BloodComponentType;
  unitsRequested: number;
  urgency: TransfusionUrgency;
  status: TransfusionRequestStatus;
  crossmatchResult: CrossmatchResult;
  assignedUnitIds: Types.ObjectId[];
  clinicalIndication?: string;
  notes?: string;
}

export interface ITransfusionRequestDocument extends ITransfusionRequest, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBloodUnitInput {
  hospitalId: string;
  donorId?: string;
  donorCode?: string;
  unitNumber: string;
  bloodGroup: BloodGroup;
  componentType: BloodComponentType;
  volumeMl: number;
  collectionDate: Date;
  expiryDate: Date;
  storageLocation?: string;
  notes?: string;
}

export interface CreateTransfusionRequestInput {
  hospitalId: string;
  patientId: string;
  requestedById: string;
  bloodGroup: BloodGroup;
  componentType: BloodComponentType;
  unitsRequested: number;
  urgency: TransfusionUrgency;
  clinicalIndication?: string;
  notes?: string;
}

export interface UpdateCrossmatchInput {
  crossmatchResult: CrossmatchResult;
  assignedUnitIds?: string[];
  notes?: string;
}

export interface UpdateTransfusionRequestStatusInput {
  status: TransfusionRequestStatus;
  notes?: string;
}

export interface GetBloodUnitsQuery {
  page?: number;
  limit?: number;
  bloodGroup?: BloodGroup;
  componentType?: BloodComponentType;
  status?: BloodUnitStatus;
  unitNumber?: string;
}

export interface GetTransfusionRequestsQuery {
  page?: number;
  limit?: number;
  status?: TransfusionRequestStatus;
  urgency?: TransfusionUrgency;
  patientId?: string;
  bloodGroup?: BloodGroup;
}