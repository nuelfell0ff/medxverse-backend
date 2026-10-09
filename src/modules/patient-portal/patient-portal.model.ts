import mongoose, { Schema, Types, Document } from 'mongoose';

export interface IPatientPortalAccount extends Document {
  hospitalId?: Types.ObjectId;
  patientId?: Types.ObjectId;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  email: string;
  password: string;
  active: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PatientPortalAccountSchema = new Schema<IPatientPortalAccount>(
  {
    // These identifiers are absent for a newly self-registered patient. They
    // are populated later only when a hospital verifies and links the account.
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: false,
      index: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: false,
      index: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// A portal account may exist before it is matched to a hospital record.
// Partial unique indexes prevent duplicate links without blocking unlinked accounts.
PatientPortalAccountSchema.index(
  { hospitalId: 1, patientId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      hospitalId: { $exists: true },
      patientId: { $exists: true },
    },
  }
);

export const PatientPortalAccountModel =
  (mongoose.models.PatientPortalAccount as
    | mongoose.Model<IPatientPortalAccount>
    | undefined) ??
  mongoose.model<IPatientPortalAccount>(
    'PatientPortalAccount',
    PatientPortalAccountSchema
  );
