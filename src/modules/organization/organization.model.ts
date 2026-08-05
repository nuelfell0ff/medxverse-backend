import mongoose, { Schema, Document } from 'mongoose';
import { IOrganization, OrganizationType } from './organization.types.js';

export interface IOrganizationDocument extends Omit<IOrganization, '_id'>, Document {}

const organizationSchema = new Schema<IOrganizationDocument>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: {
      type: String,
      enum: Object.values(OrganizationType),
      required: true,
    },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Organization = mongoose.model<IOrganizationDocument>('Organization', organizationSchema);