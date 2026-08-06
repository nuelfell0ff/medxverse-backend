import { Schema, model } from 'mongoose';
import { IOPDVisitDocument } from './opd.types.js';

const vitalsSchema = new Schema(
  {
    temperature: { type: Number },
    bloodPressureSystolic: { type: Number },
    bloodPressureDiastolic: { type: Number },
    pulseRate: { type: Number },
    respiratoryRate: { type: Number },
    oxygenSaturation: { type: Number },
    weight: { type: Number },
    height: { type: Number },
    bmi: { type: Number },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const diagnosisSchema = new Schema(
  {
    code: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    type: { type: String, enum: ['PRIMARY', 'SECONDARY'], default: 'PRIMARY' },
  },
  { _id: false }
);

const prescriptionItemSchema = new Schema(
  {
    drugName: { type: String, required: true, trim: true },
    dosage: { type: String, required: true, trim: true },
    frequency: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
    instructions: { type: String, trim: true },
    dispensed: { type: Boolean, default: false },
  },
  { _id: false }
);

const labOrderRequestSchema = new Schema(
  {
    testName: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    status: { type: String, enum: ['PENDING', 'COMPLETED'], default: 'PENDING' },
  },
  { _id: false }
);

const opdVisitSchema = new Schema<IOPDVisitDocument>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient ID is required'],
      index: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    visitNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['QUEUED', 'TRIAGED', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED'],
      default: 'QUEUED',
      index: true,
    },
    priority: {
      type: String,
      enum: ['ROUTINE', 'URGENT', 'EMERGENCY'],
      default: 'ROUTINE',
      index: true,
    },
    chiefComplaint: {
      type: String,
      required: [true, 'Chief complaint is required'],
      trim: true,
    },
    vitals: { type: vitalsSchema },
    clinicalNotes: { type: String, trim: true },
    diagnoses: { type: [diagnosisSchema], default: [] },
    prescriptions: { type: [prescriptionItemSchema], default: [] },
    labOrders: { type: [labOrderRequestSchema], default: [] },
    consultationStartTime: { type: Date },
    consultationEndTime: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const OPDVisit = model<IOPDVisitDocument>('OPDVisit', opdVisitSchema);