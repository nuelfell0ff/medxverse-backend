import mongoose, { Schema } from 'mongoose';
import { IIpdDocument, IpdStatus, DischargeStatus } from './ipd.types.js';

const ProgressNoteSchema = new Schema(
  {
    note: { type: String, required: true, trim: true },
    recordedBy: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const IpdAdmissionSchema = new Schema<IIpdDocument>(
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
    admissionDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    dischargeDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(IpdStatus),
      default: IpdStatus.ADMITTED,
      index: true,
    },
    ward: {
      type: String,
      required: [true, 'Ward name/type is required'],
      trim: true,
    },
    roomNumber: {
      type: String,
      trim: true,
    },
    bedNumber: {
      type: String,
      required: [true, 'Bed number is required'],
      trim: true,
    },
    admissionReason: {
      type: String,
      required: [true, 'Admission reason is required'],
      trim: true,
    },
    initialDiagnosis: {
      type: String,
      trim: true,
    },
    dischargeSummary: {
      type: String,
      trim: true,
    },
    dischargeStatus: {
      type: String,
      enum: Object.values(DischargeStatus),
    },
    progressNotes: [ProgressNoteSchema],
  },
  {
    timestamps: true,
  }
);

IpdAdmissionSchema.index({ hospitalId: 1, status: 1 });
IpdAdmissionSchema.index({ hospitalId: 1, ward: 1, bedNumber: 1 });

export const IpdAdmission =
  mongoose.models.IpdAdmission ||
  mongoose.model<IIpdDocument>('IpdAdmission', IpdAdmissionSchema);