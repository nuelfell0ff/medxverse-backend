import { Schema, model } from 'mongoose';
import { EncounterType, ConsultationStatus, DiagnosisType, } from './consultation.types.js';
const DiagnosisSchema = new Schema({
    code: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    type: {
        type: String,
        enum: Object.values(DiagnosisType),
        default: DiagnosisType.PRIMARY,
    },
}, { _id: false });
const PrescriptionItemSchema = new Schema({
    medicationName: { type: String, required: true, trim: true },
    dosage: { type: String, required: true, trim: true },
    frequency: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
    instructions: { type: String, trim: true },
}, { _id: false });
const LabOrderItemSchema = new Schema({
    testName: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
}, { _id: false });
const ConsultationSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', index: true },
    encounterType: {
        type: String,
        enum: Object.values(EncounterType),
        default: EncounterType.CLINIC_VISIT,
    },
    status: {
        type: String,
        enum: Object.values(ConsultationStatus),
        default: ConsultationStatus.IN_PROGRESS,
        index: true,
    },
    chiefComplaint: { type: String, required: true, trim: true },
    historyOfPresentIllness: { type: String, trim: true },
    physicalExamination: { type: String, trim: true },
    diagnoses: { type: [DiagnosisSchema], default: [] },
    treatmentPlan: { type: String, trim: true },
    prescriptions: { type: [PrescriptionItemSchema], default: [] },
    labOrders: { type: [LabOrderItemSchema], default: [] },
    followUpDate: { type: Date },
    completedAt: { type: Date },
}, { timestamps: true });
export const ConsultationModel = model('Consultation', ConsultationSchema);
