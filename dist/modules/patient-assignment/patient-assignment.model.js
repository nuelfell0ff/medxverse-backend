import mongoose, { Schema } from 'mongoose';
import { PatientAssignmentRole, PatientAssignmentSource, PatientAssignmentStatus, } from './patient-assignment.types.js';
const PatientAssignmentSchema = new Schema({
    hospitalId: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
        index: true,
    },
    patientId: {
        type: Schema.Types.ObjectId,
        ref: 'Patient',
        required: true,
        index: true,
    },
    staffId: {
        type: Schema.Types.ObjectId,
        ref: 'Staff',
        required: true,
        index: true,
    },
    role: {
        type: String,
        enum: Object.values(PatientAssignmentRole),
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: Object.values(PatientAssignmentStatus),
        default: PatientAssignmentStatus.ACTIVE,
        required: true,
        index: true,
    },
    departmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Department',
        index: true,
    },
    departmentName: {
        type: String,
        trim: true,
    },
    source: {
        type: String,
        enum: Object.values(PatientAssignmentSource),
        default: PatientAssignmentSource.MANUAL,
        required: true,
        index: true,
    },
    appointmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Appointment',
        index: true,
    },
    assignedBy: {
        type: Schema.Types.ObjectId,
        index: true,
    },
    assignedByUserType: {
        type: String,
        enum: ['STAFF', 'ACCOUNT'],
    },
    startAt: {
        type: Date,
        default: Date.now,
        required: true,
        index: true,
    },
    endAt: {
        type: Date,
        index: true,
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 5000,
    },
}, { timestamps: true });
PatientAssignmentSchema.index({ hospitalId: 1, patientId: 1, status: 1, startAt: -1 });
PatientAssignmentSchema.index({ hospitalId: 1, staffId: 1, status: 1, startAt: -1 });
PatientAssignmentSchema.index({ hospitalId: 1, patientId: 1, staffId: 1, role: 1, status: 1 });
PatientAssignmentSchema.index({ hospitalId: 1, appointmentId: 1, staffId: 1, role: 1 }, { unique: true, sparse: true });
export const PatientAssignmentModel = mongoose.models.PatientAssignment ||
    mongoose.model('PatientAssignment', PatientAssignmentSchema);
