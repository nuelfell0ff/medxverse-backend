import { Schema, model } from 'mongoose';
import { SurgeryStatus, SurgeryUrgency, AnesthesiaType, } from './ot.types.js';
const SurgicalTeamMemberSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true, trim: true },
}, { _id: false });
const SurgeryProcedureSchema = new Schema({
    code: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
}, { _id: false });
const SurgicalCaseSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    otRoomNumber: { type: String, required: true, trim: true, index: true },
    urgency: {
        type: String,
        enum: Object.values(SurgeryUrgency),
        default: SurgeryUrgency.ELECTIVE,
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: Object.values(SurgeryStatus),
        default: SurgeryStatus.SCHEDULED,
        required: true,
        index: true,
    },
    procedure: { type: SurgeryProcedureSchema, required: true },
    surgicalTeam: { type: [SurgicalTeamMemberSchema], default: [] },
    anesthesiaType: {
        type: String,
        enum: Object.values(AnesthesiaType),
        required: true,
    },
    preOpNotes: { type: String, trim: true },
    postOpNotes: { type: String, trim: true },
    scheduledStartTime: { type: Date, required: true, index: true },
    scheduledEndTime: { type: Date },
    actualStartTime: { type: Date },
    actualEndTime: { type: Date },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
SurgicalCaseSchema.index({ hospitalId: 1, status: 1, scheduledStartTime: 1 });
SurgicalCaseSchema.index({ hospitalId: 1, otRoomNumber: 1, scheduledStartTime: 1 });
export const SurgicalCaseModel = model('SurgicalCase', SurgicalCaseSchema);
