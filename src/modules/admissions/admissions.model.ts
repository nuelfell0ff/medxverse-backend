import { Schema, model } from 'mongoose';
import {
  IInpatientAdmissionDocument,
  BedType,
  AdmissionStatus,
} from './admissions.types.js';

const TransferLogSchema = new Schema(
  {
    fromWardId: { type: String, required: true },
    fromBedNumber: { type: String, required: true },
    toWardId: { type: String, required: true },
    toBedNumber: { type: String, required: true },
    transferredAt: { type: Date, default: Date.now, required: true },
    transferredBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, trim: true },
  },
  { _id: false }
);

const InpatientAdmissionSchema = new Schema<IInpatientAdmissionDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    admittingDoctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    wardId: { type: String, required: true, index: true },
    bedNumber: { type: String, required: true },
    bedType: {
      type: String,
      enum: Object.values(BedType),
      default: BedType.GENERAL,
      required: true,
    },
    admissionReason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: Object.values(AdmissionStatus),
      default: AdmissionStatus.ADMITTED,
      required: true,
      index: true,
    },
    admittedAt: { type: Date, default: Date.now, required: true },
    dischargedAt: { type: Date },
    dischargeSummary: { type: String, trim: true },
    transferHistory: [TransferLogSchema],
  },
  { timestamps: true }
);

InpatientAdmissionSchema.index({ hospitalId: 1, wardId: 1, status: 1 });

export const InpatientAdmissionModel = model<IInpatientAdmissionDocument>(
  'InpatientAdmission',
  InpatientAdmissionSchema
);