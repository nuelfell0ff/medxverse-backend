import { Schema, model } from 'mongoose';
import {
  IAmbulanceDocument,
  ITripRequestDocument,
  VehicleType,
  VehicleStatus,
  TripPriority,
  TripStatus,
} from './ambulance.types.js';

const LocationSchema = new Schema(
  {
    address: { type: String, required: true, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
  },
  { _id: false }
);

const AmbulanceSchema = new Schema<IAmbulanceDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    registrationNumber: { type: String, required: true, trim: true, unique: true },
    vehicleModel: { type: String, required: true, trim: true },
    vehicleType: {
      type: String,
      enum: Object.values(VehicleType),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(VehicleStatus),
      default: VehicleStatus.AVAILABLE,
      required: true,
      index: true,
    },
    primaryDriverId: { type: Schema.Types.ObjectId, ref: 'User' },
    fuelLevelPercentage: { type: Number, min: 0, max: 100, default: 100 },
    currentLocation: LocationSchema,
    lastMaintenanceDate: { type: Date },
    nextMaintenanceDueDate: { type: Date },
    equipmentList: [{ type: String, trim: true }],
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

AmbulanceSchema.index({ hospitalId: 1, vehicleType: 1, status: 1 });

export const AmbulanceModel = model<IAmbulanceDocument>('Ambulance', AmbulanceSchema);

const TripRequestSchema = new Schema<ITripRequestDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', index: true },
    requestedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ambulanceId: { type: Schema.Types.ObjectId, ref: 'Ambulance', index: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'User' },
    paramedicIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    priority: {
      type: String,
      enum: Object.values(TripPriority),
      default: TripPriority.MEDIUM,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(TripStatus),
      default: TripStatus.REQUESTED,
      required: true,
      index: true,
    },
    pickupLocation: { type: LocationSchema, required: true },
    dropoffLocation: { type: LocationSchema, required: true },
    distanceKm: { type: Number, min: 0 },
    dispatchTime: { type: Date },
    pickupTime: { type: Date },
    completionTime: { type: Date },
    clinicalNotes: { type: String, trim: true },
    cancellationReason: { type: String, trim: true },
  },
  { timestamps: true }
);

TripRequestSchema.index({ hospitalId: 1, status: 1, priority: 1 });

export const TripRequestModel = model<ITripRequestDocument>('TripRequest', TripRequestSchema);