import mongoose, { Schema, Types } from 'mongoose';
import {
  IWorkTaskDocument,
  IWorkTicketDocument,
  WorkTaskCategory,
  WorkTaskPriority,
  WorkTaskStatus,
  WorkTicketCategory,
  WorkTicketPriority,
  WorkTicketStatus,
  WorkModuleKey,
} from './staff-work.types.js';

const WorkTaskSchema = new Schema<IWorkTaskDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    description: { type: String, trim: true, maxlength: 5000 },
    category: { type: String, enum: Object.values(WorkTaskCategory), default: WorkTaskCategory.GENERAL, index: true },
    priority: { type: String, enum: Object.values(WorkTaskPriority), default: WorkTaskPriority.NORMAL, index: true },
    status: { type: String, enum: Object.values(WorkTaskStatus), default: WorkTaskStatus.PENDING, index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'Staff', required: true, index: true },
    createdByUserId: { type: Schema.Types.ObjectId, required: true, index: true },
    createdByStaffId: { type: Schema.Types.ObjectId, ref: 'Staff', index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', index: true },
    relatedModule: { type: String, enum: ['patients','emergency','icu','bed_ward','outpatient','surgery','radiology','lab','appointments','pharmacy','rostering','other'] satisfies WorkModuleKey[], index: true },
    relatedRecordId: { type: Schema.Types.ObjectId, index: true },
    dueAt: { type: Date, index: true },
    completedAt: Date,
    completedBy: { type: Schema.Types.ObjectId },
    cancelledAt: Date,
    cancelledBy: { type: Schema.Types.ObjectId },
  },
  { timestamps: true }
);

WorkTaskSchema.index({ hospitalId: 1, assignedTo: 1, status: 1, dueAt: 1 });
WorkTaskSchema.index({ hospitalId: 1, createdAt: -1 });

const WorkTicketCommentSchema = new Schema(
  {
    authorUserId: { type: Schema.Types.ObjectId, required: true },
    authorStaffId: { type: Schema.Types.ObjectId, ref: 'Staff' },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const WorkTicketSchema = new Schema<IWorkTicketDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    ticketNumber: { type: String, required: true, unique: true, index: true },
    subject: { type: String, required: true, trim: true, maxlength: 180 },
    description: { type: String, required: true, trim: true, maxlength: 10000 },
    category: { type: String, enum: Object.values(WorkTicketCategory), default: WorkTicketCategory.OTHER, index: true },
    priority: { type: String, enum: Object.values(WorkTicketPriority), default: WorkTicketPriority.NORMAL, index: true },
    status: { type: String, enum: Object.values(WorkTicketStatus), default: WorkTicketStatus.OPEN, index: true },
    requesterUserId: { type: Schema.Types.ObjectId, required: true, index: true },
    requesterStaffId: { type: Schema.Types.ObjectId, ref: 'Staff', index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'Staff', index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', index: true },
    relatedModule: { type: String, enum: ['patients','emergency','icu','bed_ward','outpatient','surgery','radiology','lab','appointments','pharmacy','rostering','other'] satisfies WorkModuleKey[], index: true },
    relatedRecordId: { type: Schema.Types.ObjectId, index: true },
    comments: { type: [WorkTicketCommentSchema], default: [] },
    resolvedAt: Date,
    closedAt: Date,
  },
  { timestamps: true }
);

WorkTicketSchema.index({ hospitalId: 1, status: 1, priority: 1, createdAt: -1 });
WorkTicketSchema.index({ hospitalId: 1, assignedTo: 1, status: 1 });

export const WorkTaskModel =
  (mongoose.models.WorkTask as mongoose.Model<IWorkTaskDocument> | undefined) ||
  mongoose.model<IWorkTaskDocument>('WorkTask', WorkTaskSchema);

export const WorkTicketModel =
  (mongoose.models.WorkTicket as mongoose.Model<IWorkTicketDocument> | undefined) ||
  mongoose.model<IWorkTicketDocument>('WorkTicket', WorkTicketSchema);

export const isObjectId = (value: unknown): value is string =>
  typeof value === 'string' && Types.ObjectId.isValid(value);
