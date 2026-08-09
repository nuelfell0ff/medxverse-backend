import { Schema, model } from 'mongoose';
import {
  IAppointmentDocument,
  AppointmentStatus,
  AppointmentType,
} from './appointment.types.js';

const AppointmentSchema = new Schema<IAppointmentDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    // ⚠️ Verify 'Account' is the correct model name where doctor firstName, lastName, department exist.
    // If doctors are in a Staff model, change 'Account' to 'Staff'.
    doctorId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
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
  },
  { timestamps: true }
);

export const AppointmentModel = model<IAppointmentDocument>('Appointment', AppointmentSchema);
