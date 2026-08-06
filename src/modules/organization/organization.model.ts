import { Schema, model } from 'mongoose';
import { OrgType } from '../../constants/roles.enum.js';
import { IOrganizationDocument } from './organization.types.js';

const organizationSchema = new Schema<IOrganizationDocument>(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(OrgType),
      required: [true, 'Organization type (HOSPITAL or HMO) is required'],
      index: true,
    },
    code: {
      type: String,
      required: [true, 'Organization unique code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Organization primary email is required'],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Organization contact phone number is required'],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    logoUrl: {
      type: String,
      trim: true,
    },
    registrationNumber: {
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

export const Organization = model<IOrganizationDocument>(
  'Organization',
  organizationSchema
);