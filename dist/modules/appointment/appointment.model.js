import { Schema, model } from 'mongoose';
import { AppointmentStatus, AppointmentType, } from './appointment.types.js';
const AppointmentSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    appointmentDate: { type: Date, required: true, index: true },
    startTime: { type: String, required: true },
    endTime: { type: String },
    type: {
        type: String,
        enum: Object.values(AppointmentType),
        default: AppointmentType.CONSULTATION,
    },
    status: {
        type: String,
        enum: Object.values(AppointmentStatus),
        default: AppointmentStatus.SCHEDULED,
        index: true,
    },
    reason: { type: String },
    notes: { type: String },
}, { timestamps: true });
export const AppointmentModel = model('Appointment', AppointmentSchema);
