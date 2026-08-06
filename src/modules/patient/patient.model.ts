import { Schema, model } from 'mongoose';
import { IPatientDocument } from './patient.types.js';

const emergencyContactSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    relationship: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const patientSchema = new Schema<IPatientDocument>(
  {
    mrn: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
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
      enum: ['MALE', 'FEMALE', 'OTHER'],
      required: [true, 'Gender is required'],
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      index: true,
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
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    genotype: {
      type: String,
      enum: ['AA', 'AS', 'SS', 'AC', 'SC'],
    },
    allergies: {
      type: [String],
      default: [],
    },
    chronicConditions: {
      type: [String],
      default: [],
    },
    emergencyContact: {
      type: emergencyContactSchema,
      required: [true, 'Emergency contact details are required'],
    },
    insuranceType: {
      type: String,
      enum: ['SELF_PAY', 'HMO'],
      default: 'SELF_PAY',
      required: true,
      index: true,
    },
    hmoProvider: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    hmoPolicyNumber: {
      type: String,
      trim: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Hospital Organization ID is required'],
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

patientSchema.index({ firstName: 'text', lastName: 'text', mrn: 'text', phoneNumber: 'text' });

export const Patient = model<IPatientDocument>('Patient', patientSchema);