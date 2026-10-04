import mongoose, { Schema, Types } from 'mongoose';

export enum StaffInvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

export interface IStaffInvitation {
  hospitalId: Types.ObjectId;
  staffId: Types.ObjectId;
  email: string;
  role: string;
  tokenHash: string;
  expiresAt: Date;
  status: StaffInvitationStatus;
  invitedBy?: Types.ObjectId;
  acceptedAt?: Date;
  acceptedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStaffInvitationDocument extends IStaffInvitation, mongoose.Document {
  _id: Types.ObjectId;
}

const StaffInvitationSchema = new Schema<IStaffInvitationDocument>(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    staffId: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(StaffInvitationStatus),
      default: StaffInvitationStatus.PENDING,
      index: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
    },
    acceptedAt: Date,
    acceptedBy: {
      type: Schema.Types.ObjectId,
      ref: 'StaffUser',
    },
  },
  { timestamps: true }
);

StaffInvitationSchema.index({ hospitalId: 1, staffId: 1, status: 1 });
StaffInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export const StaffInvitation =
  mongoose.models.StaffInvitation ||
  mongoose.model<IStaffInvitationDocument>('StaffInvitation', StaffInvitationSchema);
