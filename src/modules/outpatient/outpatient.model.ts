import { Schema, model } from 'mongoose';
import {
  IOutpatientDocument,
  TriagePriority,
  ConsultationStatus,
} from './outpatient.types.js';

const VitalSignsSchema = new Schema(
  {
    temperature: { type: Number },
    bloodPressureSystolic: { type: Number },
    bloodPressureDiastolic: { type: Number },
    pulseRate: { type: Number },
    respiratoryRate: { type: Number },
    oxygenSaturation: { type: Number },
    height: { type: Number },
    weight: { type: Number },
    bmi: { type: Number },
  },
  { _id: false }
);

const OutpatientSchema = new Schema<IOutpatientDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    triagePriority: {
      type: String,
      enum: Object.values(TriagePriority),
      default: TriagePriority.STANDARD,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ConsultationStatus),
      default: ConsultationStatus.IN_QUEUE,
      required: true,
      index: true,
    },
    chiefComplaint: { type: String, required: true, trim: true },
    vitalSigns: { type: VitalSignsSchema },
    nursingNotes: { type: String, trim: true },
    consultationNotes: { type: String, trim: true },
    diagnoses: [{ type: String, trim: true }],
    queuedAt: { type: Date, default: Date.now, required: true },
    consultationStartedAt: { type: Date },
    consultationEndedAt: { type: Date },
  },
  { timestamps: true }
);

OutpatientSchema.index({ hospitalId: 1, status: 1, queuedAt: 1 });

export const OutpatientModel = model<IOutpatientDocument>('Outpatient', OutpatientSchema);