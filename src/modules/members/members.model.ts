import mongoose, { Schema, model } from 'mongoose';
import { IMemberDocument } from './members.types.js';

const MemberAddressSchema = new Schema(
  {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true, default: 'Nigeria' },
  },
  { _id: false }
);

const MemberSchema = new Schema<IMemberDocument>(
  {
    hmoId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    policyNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
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
    otherNames: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER'],
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    maritalStatus: {
      type: String,
      enum: ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'],
      default: 'SINGLE',
    },
    address: {
      type: MemberAddressSchema,
    },
    benefitPlanId: {
      type: Schema.Types.ObjectId,
      ref: 'BenefitPlan',
      required: true,
      index: true,
    },
    primaryProviderId: {
      type: Schema.Types.ObjectId,
      ref: 'Provider',
      index: true,
    },
    relationship: {
      type: String,
      enum: ['PRIMARY', 'SPOUSE', 'CHILD', 'DEPENDENT'],
      default: 'PRIMARY',
    },
    primaryMemberId: {
      type: Schema.Types.ObjectId,
      ref: 'HMSMember',
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'TERMINATED', 'PENDING'],
      default: 'ACTIVE',
      index: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    photoUrl: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

MemberSchema.index({ hmoId: 1, policyNumber: 1 }, { unique: true });
MemberSchema.index({ hmoId: 1, email: 1 });
MemberSchema.index({ firstName: 'text', lastName: 'text', policyNumber: 'text', email: 'text' });

export const MemberModel =
  mongoose.models.HMSMember || model<IMemberDocument>('HMSMember', MemberSchema);