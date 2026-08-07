import { Schema, model } from 'mongoose';
import {
  IEmergencyCaseDocument,
  TriageCategory,
  EmergencyStatus,
  ArrivalMode,
  TraumaType,
} from './emergency.types.js';

const TriageVitalsSchema = new Schema(
  {
    heartRateBpm: { type: Number, min: 0, max: 300 },
    bloodPressure: { type: String, trim: true },
    respiratoryRateBpm: { type: Number, min: 0, max: 100 },
    oxygenSaturationPct: { type: Number, min: 0, max: 100 },
    temperatureCelsius: { type: Number, min: 20, max: 45 },
    glasgowComaScale: { type: Number, min: 3, max: 15 },
    painScale: { type: Number, min: 0, max: 10 },
  },
  { _id: false }
);

const EmergencyCaseSchema = new Schema<IEmergencyCaseDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', index: true },
    isUnidentified: { type: Boolean, default: false, index: true },
    temporaryIdentifier: { type: String, trim: true },
    chiefComplaint: { type: String, required: true, trim: true },
    arrivalMode: {
      type: String,
      enum: Object.values(ArrivalMode),
      default: ArrivalMode.WALK_IN,
      required: true,
    },
    triageCategory: {
      type: String,
      enum: Object.values(TriageCategory),
      required: true,
      index: true,
    },
    triageVitals: { type: TriageVitalsSchema },
    assignedBay: { type: String, trim: true },
    traumaType: {
      type: String,
      enum: Object.values(TraumaType),
      default: TraumaType.NONE,
      required: true,
      index: true,
    },
    attendingDoctorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    triagedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: Object.values(EmergencyStatus),
      default: EmergencyStatus.TRIAGED,
      required: true,
      index: true,
    },
    dispositionNotes: { type: String, trim: true },
    admittedToWardId: { type: Schema.Types.ObjectId, ref: 'Ward' },
    transferredToFacility: { type: String, trim: true },
  },
  { timestamps: true }
);

EmergencyCaseSchema.index({ hospitalId: 1, status: 1, triageCategory: 1 });

export const EmergencyCaseModel = model<IEmergencyCaseDocument>(
  'EmergencyCase',
  EmergencyCaseSchema
);