import { Schema, model } from 'mongoose';
import {
  IICUAdmissionDocument,
  CareLevel,
  ICUCaseStatus,
  VentilatorMode,
} from './icu.types.js';

const VentilatorSettingsSchema = new Schema(
  {
    mode: {
      type: String,
      enum: Object.values(VentilatorMode),
      default: VentilatorMode.NONE,
      required: true,
    },
    fio2Pct: { type: Number, min: 21, max: 100 },
    peepCmH2O: { type: Number, min: 0, max: 30 },
    tidalVolumeMl: { type: Number, min: 0, max: 2000 },
    respiratoryRate: { type: Number, min: 0, max: 100 },
    pressureSupportCmH2O: { type: Number, min: 0, max: 50 },
    isIntubated: { type: Boolean, default: false },
  },
  { _id: false }
);

const ICUVitalsSchema = new Schema(
  {
    heartRateBpm: { type: Number, min: 0, max: 300 },
    systolicBpMmHg: { type: Number, min: 0, max: 300 },
    diastolicBpMmHg: { type: Number, min: 0, max: 200 },
    meanArterialPressureMmHg: { type: Number, min: 0, max: 250 },
    oxygenSaturationPct: { type: Number, min: 0, max: 100 },
    temperatureCelsius: { type: Number, min: 20, max: 45 },
    centralVenousPressureMmHg: { type: Number, min: -10, max: 50 },
    intracranialPressureMmHg: { type: Number, min: 0, max: 100 },
    glasgowComaScale: { type: Number, min: 3, max: 15 },
  },
  { _id: false }
);

const ICUAdmissionSchema = new Schema<IICUAdmissionDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    bedNumber: { type: String, required: true, trim: true, index: true },
    careLevel: {
      type: String,
      enum: Object.values(CareLevel),
      default: CareLevel.LEVEL_2_ICU,
      required: true,
      index: true,
    },
    primaryDiagnosis: { type: String, required: true, trim: true },
    attendingPhysicianId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    admittedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vitals: { type: ICUVitalsSchema },
    ventilatorSettings: { type: VentilatorSettingsSchema },
    status: {
      type: String,
      enum: Object.values(ICUCaseStatus),
      default: ICUCaseStatus.ADMITTED,
      required: true,
      index: true,
    },
    transferredToWardId: { type: Schema.Types.ObjectId, ref: 'Ward' },
    dispositionNotes: { type: String, trim: true },
    admittedAt: { type: Date, default: Date.now, required: true },
    dischargedAt: { type: Date },
  },
  { timestamps: true }
);

ICUAdmissionSchema.index({ hospitalId: 1, status: 1, bedNumber: 1 });

export const ICUAdmissionModel = model<IICUAdmissionDocument>(
  'ICUAdmission',
  ICUAdmissionSchema
);