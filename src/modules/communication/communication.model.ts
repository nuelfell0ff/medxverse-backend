import mongoose, { Schema, Types } from 'mongoose';
import {
  ConversationPriority,
  ConversationType,
  IConversationDocument,
  IMessageDocument,
  ITicketDocument,
  MessageType,
  ParticipantType,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from './communication.types.js';

const ParticipantSchema = new Schema(
  {
    type: { type: String, enum: Object.values(ParticipantType), required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'StaffUser', index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', index: true },
    joinedAt: { type: Date, default: Date.now },
    lastReadAt: Date,
    muted: { type: Boolean, default: false },
  },
  { _id: false }
);

const ConversationSchema = new Schema<IConversationDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    type: { type: String, enum: Object.values(ConversationType), required: true, index: true },
    title: { type: String, trim: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', index: true },
    directKey: { type: String, sparse: true, index: true },
    participants: { type: [ParticipantSchema], default: [] },
    priority: { type: String, enum: Object.values(ConversationPriority), default: ConversationPriority.NORMAL, index: true },
    lastMessageAt: { type: Date, index: true },
    lastMessagePreview: { type: String, maxlength: 500 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'StaffUser' },
    archivedAt: Date,
  },
  { timestamps: true }
);

ConversationSchema.index({ hospitalId: 1, 'participants.userId': 1, lastMessageAt: -1 });
ConversationSchema.index({ hospitalId: 1, patientId: 1, lastMessageAt: -1 });
ConversationSchema.index({ hospitalId: 1, departmentId: 1, lastMessageAt: -1 });
ConversationSchema.index({ hospitalId: 1, directKey: 1 }, { unique: true, sparse: true });

const AttachmentSchema = new Schema(
  {
    url: { type: String, required: true },
    name: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: Number,
  },
  { _id: false }
);

const ReadReceiptSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'StaffUser', required: true },
    readAt: { type: Date, required: true },
  },
  { _id: false }
);

const MessageSchema = new Schema<IMessageDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    senderType: { type: String, enum: Object.values(ParticipantType), required: true },
    senderUserId: { type: Schema.Types.ObjectId, ref: 'StaffUser', index: true },
    body: { type: String, trim: true, maxlength: 10000 },
    type: { type: String, enum: Object.values(MessageType), default: MessageType.TEXT },
    attachments: { type: [AttachmentSchema], default: [] },
    readBy: { type: [ReadReceiptSchema], default: [] },
    editedAt: Date,
    deletedAt: Date,
  },
  { timestamps: true }
);

MessageSchema.index({ hospitalId: 1, conversationId: 1, createdAt: -1 });
MessageSchema.index({ hospitalId: 1, senderUserId: 1, createdAt: -1 });

const TicketSchema = new Schema<ITicketDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', index: true },
    subject: { type: String, required: true, trim: true, maxlength: 250 },
    category: { type: String, enum: Object.values(TicketCategory), default: TicketCategory.GENERAL, index: true },
    priority: { type: String, enum: Object.values(TicketPriority), default: TicketPriority.MEDIUM, index: true },
    status: { type: String, enum: Object.values(TicketStatus), default: TicketStatus.OPEN, index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'StaffUser', index: true },
    assignedDepartmentId: { type: Schema.Types.ObjectId, ref: 'Department', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'StaffUser', required: true },
    description: { type: String, maxlength: 10000 },
    escalationReason: String,
    escalatedAt: Date,
    resolvedAt: Date,
    closedAt: Date,
  },
  { timestamps: true }
);

TicketSchema.index({ hospitalId: 1, status: 1, priority: 1, updatedAt: -1 });
TicketSchema.index({ hospitalId: 1, assignedTo: 1, status: 1 });

export const Conversation = mongoose.models.Conversation as mongoose.Model<IConversationDocument> | undefined
  ? (mongoose.models.Conversation as mongoose.Model<IConversationDocument>)
  : mongoose.model<IConversationDocument>('Conversation', ConversationSchema);
export const Message = mongoose.models.Message as mongoose.Model<IMessageDocument> | undefined
  ? (mongoose.models.Message as mongoose.Model<IMessageDocument>)
  : mongoose.model<IMessageDocument>('Message', MessageSchema);
export const Ticket = mongoose.models.CommunicationTicket as mongoose.Model<ITicketDocument> | undefined
  ? (mongoose.models.CommunicationTicket as mongoose.Model<ITicketDocument>)
  : mongoose.model<ITicketDocument>('CommunicationTicket', TicketSchema);
