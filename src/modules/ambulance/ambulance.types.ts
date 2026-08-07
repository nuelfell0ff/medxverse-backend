import { Document, Types } from 'mongoose';

export enum VehicleType {
  BASIC_LIFE_SUPPORT = 'BASIC_LIFE_SUPPORT',
  ADVANCED_LIFE_SUPPORT = 'ADVANCED_LIFE_SUPPORT',
  PATIENT_TRANSPORT = 'PATIENT_TRANSPORT',
  ICU_AMBULANCE = 'ICU_AMBULANCE',
  NEONATAL_AMBULANCE = 'NEONATAL_AMBULANCE',
}

export enum VehicleStatus {
  AVAILABLE = 'AVAILABLE',
  DISPATCHED = 'DISPATCHED',
  EN_ROUTE = 'EN_ROUTE',
  MAINTENANCE = 'MAINTENANCE',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
}

export enum TripPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum TripStatus {
  REQUESTED = 'REQUESTED',
  DISPATCHED = 'DISPATCHED',
  EN_ROUTE_TO_SCENE = 'EN_ROUTE_TO_SCENE',
  ARRIVED_AT_SCENE = 'ARRIVED_AT_SCENE',
  PATIENT_ONBOARD = 'PATIENT_ONBOARD',
  EN_ROUTE_TO_DESTINATION = 'EN_ROUTE_TO_DESTINATION',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface ILocation {
  address: string;
  latitude?: number;
  longitude?: number;
}

export interface IAmbulance {
  hospitalId: Types.ObjectId;
  registrationNumber: string;
  vehicleModel: string;
  vehicleType: VehicleType;
  status: VehicleStatus;
  primaryDriverId?: Types.ObjectId;
  fuelLevelPercentage?: number;
  currentLocation?: ILocation;
  lastMaintenanceDate?: Date;
  nextMaintenanceDueDate?: Date;
  equipmentList?: string[];
  notes?: string;
}

export interface IAmbulanceDocument extends IAmbulance, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface ITripRequest {
  hospitalId: Types.ObjectId;
  patientId?: Types.ObjectId;
  requestedById: Types.ObjectId;
  ambulanceId?: Types.ObjectId;
  driverId?: Types.ObjectId;
  paramedicIds: Types.ObjectId[];
  priority: TripPriority;
  status: TripStatus;
  pickupLocation: ILocation;
  dropoffLocation: ILocation;
  distanceKm?: number;
  dispatchTime?: Date;
  pickupTime?: Date;
  completionTime?: Date;
  clinicalNotes?: string;
  cancellationReason?: string;
}

export interface ITripRequestDocument extends ITripRequest, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAmbulanceInput {
  hospitalId: string;
  registrationNumber: string;
  vehicleModel: string;
  vehicleType: VehicleType;
  primaryDriverId?: string;
  fuelLevelPercentage?: number;
  lastMaintenanceDate?: Date;
  nextMaintenanceDueDate?: Date;
  equipmentList?: string[];
  notes?: string;
}

export interface UpdateAmbulanceStatusInput {
  status: VehicleStatus;
  fuelLevelPercentage?: number;
  currentLocation?: ILocation;
  notes?: string;
}

export interface CreateTripRequestInput {
  hospitalId: string;
  patientId?: string;
  requestedById: string;
  priority: TripPriority;
  pickupLocation: ILocation;
  dropoffLocation: ILocation;
  clinicalNotes?: string;
}

export interface AssignTripInput {
  ambulanceId: string;
  driverId: string;
  paramedicIds?: string[];
}

export interface UpdateTripStatusInput {
  status: TripStatus;
  cancellationReason?: string;
  clinicalNotes?: string;
  distanceKm?: number;
}

export interface GetAmbulancesQuery {
  page?: number;
  limit?: number;
  vehicleType?: VehicleType;
  status?: VehicleStatus;
  registrationNumber?: string;
}

export interface GetTripRequestsQuery {
  page?: number;
  limit?: number;
  status?: TripStatus;
  priority?: TripPriority;
  patientId?: string;
  ambulanceId?: string;
}