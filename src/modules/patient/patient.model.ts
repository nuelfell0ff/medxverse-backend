import mongoose, { Schema } from 'mongoose';
import { IPatientDocument, Gender, BloodGroup, PatientCategory } from './patient.types.js';

const PatientSchema = new Schema<IPatientDocument>(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Hospital account ID is required'],
      index: true,
    },
    mrn: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      enum: Object.values(Gender),
      required: [true, 'Gender is required'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    bloodGroup: {
      type: String,
      enum: Object.values(BloodGroup),
    },
    genotype: {
      type: String,
      trim: true,
    },
    allergies: [
      {
        type: String,
        trim: true,
      },
    ],
    category: {
      type: String,
      enum: Object.values(PatientCategory),
      default: PatientCategory.SELF_PAY,
    },
    hmoId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      index: true,
    },
    hmoPolicyNumber: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

PatientSchema.index({ hospitalId: 1, mrn: 1 });
PatientSchema.index({ hospitalId: 1, phone: 1 });

export const Patient =
  mongoose.models.Patient ||
  mongoose.model<IPatientDocument>('Patient', PatientSchema);