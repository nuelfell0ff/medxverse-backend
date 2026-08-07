import { Schema, model } from 'mongoose';
import {
  IWard,
  IWardDocument,
  IBed,
  IBedDocument,
  IInpatientAdmission,
  IInpatientAdmissionDocument,
  WardType,
  BedStatus,
  AdmissionStatus,
} from './ipd.types.js';

const WardSchema = new Schema<IWard>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: Object.values(WardType),
      default: WardType.GENERAL,
      required: true,
    },
    capacity: { type: Number, required: true, min: 1 },
    description: { type: String, trim: true },
    isOperational: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const BedSchema = new Schema<IBed>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    wardId: { type: Schema.Types.ObjectId, ref: 'Ward', required: true, index: true },
    bedNumber: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: Object.values(BedStatus),
      default: BedStatus.AVAILABLE,
      index: true,
    },
    dailyRate: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

BedSchema.index({ wardId: 1, bedNumber: 1 }, { unique: true });

const DailyProgressNoteSchema = new Schema(
  {
    note: { type: String, required: true, trim: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const InpatientAdmissionSchema = new Schema<IInpatientAdmissionDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctorInChargeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    wardId: { type: Schema.Types.ObjectId, ref: 'Ward', required: true, index: true },
    bedId: { type: Schema.Types.ObjectId, ref: 'Bed', required: true, index: true },
    admissionNumber: { type: String, required: true, unique: true, trim: true, index: true },
    admissionDate: { type: Date, default: Date.now, required: true, index: true },
    dischargeDate: { type: Date },
    status: {
      type: String,
      enum: Object.values(AdmissionStatus),
      default: AdmissionStatus.ADMITTED,
      index: true,
    },
    admissionReason: { type: String, required: true, trim: true },
    diagnosis: { type: String, trim: true },
    estimatedDischargeDate: { type: Date },
    progressNotes: [DailyProgressNoteSchema],
    dischargeSummary: { type: String, trim: true },
    admittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dischargedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const WardModel = model<IWard>('Ward', WardSchema);
export const BedModel = model<IBed>('Bed', BedSchema);
export const InpatientAdmissionModel = model<IInpatientAdmissionDocument>(
  'InpatientAdmission',
  InpatientAdmissionSchema
);