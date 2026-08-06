import mongoose, { Schema } from 'mongoose';
import { IOpdDocument, OpdStatus } from './opd.types.js';

const VitalsSchema = new Schema(
  {
    bloodPressure: { type: String, trim: true },
    pulseRate: { type: Number },
    temperature: { type: Number },
    respiratoryRate: { type: Number },
    weight: { type: Number },
    height: { type: Number },
    spo2: { type: Number },
  },
  { _id: false }
);

const OpdEncounterSchema = new Schema<IOpdDocument>(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Hospital account ID is required'],
      index: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient ID is required'],
      index: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: [true, 'Attending doctor ID is required'],
      index: true,
    },
    encounterDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(OpdStatus),
      default: OpdStatus.WAITING,
      index: true,
    },
    reasonForVisit: {
      type: String,
      required: [true, 'Reason for visit is required'],
      trim: true,
    },
    vitals: {
      type: VitalsSchema,
    },
    symptoms: [
      {
        type: String,
        trim: true,
      },
    ],
    diagnosis: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

OpdEncounterSchema.index({ hospitalId: 1, encounterDate: -1 });
OpdEncounterSchema.index({ hospitalId: 1, doctorId: 1, status: 1 });

export const OpdEncounter =
  mongoose.models.OpdEncounter ||
  mongoose.model<IOpdDocument>('OpdEncounter', OpdEncounterSchema);