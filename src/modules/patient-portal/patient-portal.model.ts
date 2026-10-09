import { Schema, model, models, Types, Document } from 'mongoose';

export interface IPatientPortalAccount extends Document {
  hospitalId: Types.ObjectId;
  patientId: Types.ObjectId;
  email: string;
  password: string;
  active: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PatientPortalAccountSchema = new Schema<IPatientPortalAccount>({
  hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  active: { type: Boolean, default: true, index: true },
  lastLoginAt: Date,
}, { timestamps: true });

PatientPortalAccountSchema.index({ hospitalId: 1, email: 1 }, { unique: true });
PatientPortalAccountSchema.index({ hospitalId: 1, patientId: 1 }, { unique: true });

export const PatientPortalAccountModel = models.PatientPortalAccount || model<IPatientPortalAccount>('PatientPortalAccount', PatientPortalAccountSchema);
