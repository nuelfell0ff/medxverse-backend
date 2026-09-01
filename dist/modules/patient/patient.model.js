import { Schema, model } from 'mongoose';
import { Gender, AllergySeverity, MedicalHistoryStatus, } from './patient.types.js';
const VitalsSchema = new Schema({
    temperature: { type: Number },
    systolicBp: { type: Number },
    diastolicBp: { type: Number },
    pulseRate: { type: Number },
    respiratoryRate: { type: Number },
    spo2: { type: Number },
    weight: { type: Number },
    height: { type: Number },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recordedAt: { type: Date, default: Date.now },
}, { _id: true });
const PatientSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    mrn: { type: String, required: true, unique: true, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: Object.values(Gender), required: true },
    phone: { type: String, required: true },
    email: { type: String },
    address: { type: String },
    maritalStatus: { type: String, required: true },
    occupation: { type: String, required: true },
    nextOfKin: { type: String, required: true },
    informant: { type: String, required: true },
    bloodGroup: { type: String },
    genotype: { type: String },
    policyNumber: { type: String },
    hmoId: { type: Schema.Types.ObjectId, ref: 'HmoProvider' },
    vitalsHistory: { type: [VitalsSchema], default: [] },
    allergies: {
        type: [
            {
                allergen: { type: String, required: true },
                reaction: { type: String, required: true },
                severity: {
                    type: String,
                    enum: Object.values(AllergySeverity),
                    default: AllergySeverity.MODERATE,
                },
            },
        ],
        default: [],
    },
    medicalHistory: {
        type: [
            {
                condition: { type: String, required: true },
                diagnosedDate: { type: Date },
                status: {
                    type: String,
                    enum: Object.values(MedicalHistoryStatus),
                    default: MedicalHistoryStatus.ACTIVE,
                },
                notes: { type: String },
            },
        ],
        default: [],
    },
    isFlagged: { type: Boolean, default: false },
    flagReason: { type: String },
}, { timestamps: true });
PatientSchema.index({ hospitalId: 1, createdAt: -1 });
PatientSchema.index({ hospitalId: 1, lastName: 1, firstName: 1 });
PatientSchema.index({ hospitalId: 1, phone: 1 });
export const PatientModel = model('Patient', PatientSchema);
