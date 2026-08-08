import { Schema, model } from 'mongoose';
import { ConsultationType, ConsultationStatus, } from './telemedicine.types.js';
const TelemedicineSessionSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    consultationType: {
        type: String,
        enum: Object.values(ConsultationType),
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: Object.values(ConsultationStatus),
        default: ConsultationStatus.WAITING_ROOM,
        index: true,
    },
    scheduledStartTime: { type: Date, required: true, index: true },
    joinedWaitingRoomAt: { type: Date },
    actualStartTime: { type: Date },
    endTime: { type: Date },
    durationMinutes: { type: Number },
    meetingRoomId: { type: String, required: true, unique: true },
    meetingUrl: { type: String },
    chiefComplaint: { type: String, trim: true },
    clinicalNotes: { type: String, trim: true },
    recordingUrl: { type: String },
}, { timestamps: true });
TelemedicineSessionSchema.index({ hospitalId: 1, scheduledStartTime: 1, status: 1 });
export const TelemedicineSessionModel = model('TelemedicineSession', TelemedicineSessionSchema);
const TelemedicineMessageSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    sessionId: {
        type: Schema.Types.ObjectId,
        ref: 'TelemedicineSession',
        required: true,
        index: true,
    },
    senderId: { type: Schema.Types.ObjectId, required: true },
    senderModel: { type: String, enum: ['User', 'Patient'], required: true },
    messageText: { type: String, required: true, trim: true },
    attachmentUrl: { type: String },
    sentAt: { type: Date, default: Date.now },
}, { timestamps: false });
export const TelemedicineMessageModel = model('TelemedicineMessage', TelemedicineMessageSchema);
