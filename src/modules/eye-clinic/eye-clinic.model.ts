import { Schema, model } from 'mongoose';
import {
  IEyeExamDocument,
  IOpticalPrescriptionDocument,
  ExamType,
  PrescriptionType,
  LensType,
} from './eye-clinic.types.js';

const RefractionDataSchema = new Schema(
  {
    sphere: { type: Number },
    cylinder: { type: Number },
    axis: { type: Number, min: 0, max: 180 },
    add: { type: Number },
    visualAcuity: { type: String, trim: true },
  },
  { _id: false }
);

const PrescriptionEyeDetailSchema = new Schema(
  {
    sphere: { type: Number },
    cylinder: { type: Number },
    axis: { type: Number, min: 0, max: 180 },
    add: { type: Number },
    visualAcuity: { type: String, trim: true },
    baseCurve: { type: Number },
    diameter: { type: Number },
    brand: { type: String, trim: true },
  },
  { _id: false }
);

const EyeExamSchema = new Schema<IEyeExamDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    examinerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    examType: {
      type: String,
      enum: Object.values(ExamType),
      required: true,
      index: true,
    },
    chiefComplaint: { type: String, trim: true },
    visualAcuityUncorrected: {
      rightEye: { type: String, trim: true },
      leftEye: { type: String, trim: true },
    },
    refraction: {
      rightEye: RefractionDataSchema,
      leftEye: RefractionDataSchema,
      pupillaryDistanceMm: { type: Number },
    },
    tonometry: {
      iopRightEyeMmHg: { type: Number },
      iopLeftEyeMmHg: { type: Number },
      measurementTime: { type: Date },
      method: { type: String, trim: true },
    },
    slitLampFindings: {
      cornea: { type: String, trim: true },
      anteriorChamber: { type: String, trim: true },
      lens: { type: String, trim: true },
      iris: { type: String, trim: true },
    },
    fundusFindings: {
      opticDisc: { type: String, trim: true },
      macula: { type: String, trim: true },
      vessels: { type: String, trim: true },
      periphery: { type: String, trim: true },
    },
    diagnosis: [{ type: String, trim: true }],
    treatmentPlan: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

EyeExamSchema.index({ hospitalId: 1, patientId: 1, createdAt: -1 });

export const EyeExamModel = model<IEyeExamDocument>('EyeExam', EyeExamSchema);

const OpticalPrescriptionSchema = new Schema<IOpticalPrescriptionDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    prescribedById: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    examId: { type: Schema.Types.ObjectId, ref: 'EyeExam', index: true },
    prescriptionType: {
      type: String,
      enum: Object.values(PrescriptionType),
      required: true,
      index: true,
    },
    lensType: {
      type: String,
      enum: Object.values(LensType),
      required: true,
    },
    rightEye: { type: PrescriptionEyeDetailSchema, required: true },
    leftEye: { type: PrescriptionEyeDetailSchema, required: true },
    pupillaryDistanceMm: { type: Number },
    expirationDate: { type: Date, required: true, index: true },
    specialInstructions: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

OpticalPrescriptionSchema.index({ hospitalId: 1, patientId: 1, isActive: 1 });

export const OpticalPrescriptionModel = model<IOpticalPrescriptionDocument>(
  'OpticalPrescription',
  OpticalPrescriptionSchema
);