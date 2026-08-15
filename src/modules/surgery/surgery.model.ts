import { Schema, model } from 'mongoose';
import {
  ISurgeryCaseDocument,
  SurgeryStatus,
  UrgencyLevel,
  AnesthesiaType,
} from './surgery.types.js';

const SurgicalTeamMemberSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    role: {
      type: String,
      enum: ['PRIMARY_SURGEON', 'ASSISTING_SURGEON', 'ANAESTHETIST', 'SCRUB_NURSE', 'CIRCULATING_NURSE'],
      required: true,
    },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const SurgicalChecklistSchema = new Schema(
  {
    signInCompleted: { type: Boolean, default: false },
    signInCompletedAt: { type: Date },
    timeOutCompleted: { type: Boolean, default: false },
    timeOutCompletedAt: { type: Date },
    signOutCompleted: { type: Boolean, default: false },
    signOutCompletedAt: { type: Date },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const SurgeryCaseSchema = new Schema<ISurgeryCaseDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    leadSurgeonId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    theatreId: { type: String, required: true, index: true },
    procedureName: { type: String, required: true, trim: true },
    icdCode: { type: String, trim: true },
    urgency: {
      type: String,
      enum: Object.values(UrgencyLevel),
      default: UrgencyLevel.ELECTIVE,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(SurgeryStatus),
      default: SurgeryStatus.SCHEDULED,
      required: true,
      index: true,
    },
    scheduledStartTime: { type: Date, required: true },
    scheduledEndTime: { type: Date, required: true },
    actualStartTime: { type: Date },
    actualEndTime: { type: Date },
    anesthesiaType: {
      type: String,
      enum: Object.values(AnesthesiaType),
      required: true,
    },
    surgicalTeam: [SurgicalTeamMemberSchema],
    checklist: {
      type: SurgicalChecklistSchema,
      default: () => ({
        signInCompleted: false,
        timeOutCompleted: false,
        signOutCompleted: false,
      }),
    },
    anesthesiaNotes: { type: String, trim: true },
    operationNotes: { type: String, trim: true },
    postOpNotes: { type: String, trim: true },
    cancellationReason: { type: String, trim: true },
  },
  { timestamps: true }
);

SurgeryCaseSchema.index({ hospitalId: 1, theatreId: 1, scheduledStartTime: 1 });

export const SurgeryCaseModel = model<ISurgeryCaseDocument>('SurgeryCase', SurgeryCaseSchema);
