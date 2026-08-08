import { Schema, model } from 'mongoose';
import { ToothStatus, ToothSurface, DentalProcedureType, ProcedureStatus, } from './dental.types.js';
const ToothRecordSchema = new Schema({
    toothNumber: { type: Number, required: true, min: 1, max: 52 },
    status: {
        type: String,
        enum: Object.values(ToothStatus),
        default: ToothStatus.HEALTHY,
        required: true,
    },
    affectedSurfaces: [
        {
            type: String,
            enum: Object.values(ToothSurface),
        },
    ],
    notes: { type: String, trim: true },
}, { _id: false });
const DentalChartSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    dentistId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    teeth: [ToothRecordSchema],
    overallPeriodontalHealth: { type: String, trim: true },
    notes: { type: String, trim: true },
}, { timestamps: true });
DentalChartSchema.index({ hospitalId: 1, patientId: 1 }, { unique: true });
export const DentalChartModel = model('DentalChart', DentalChartSchema);
const DentalProcedureSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    dentistId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    procedureType: {
        type: String,
        enum: Object.values(DentalProcedureType),
        required: true,
        index: true,
    },
    toothNumber: { type: Number, min: 1, max: 52 },
    surfaces: [
        {
            type: String,
            enum: Object.values(ToothSurface),
        },
    ],
    status: {
        type: String,
        enum: Object.values(ProcedureStatus),
        default: ProcedureStatus.PLANNED,
        required: true,
        index: true,
    },
    cost: { type: Number, min: 0 },
    performedAt: { type: Date },
    clinicalNotes: { type: String, trim: true },
}, { timestamps: true });
DentalProcedureSchema.index({ hospitalId: 1, patientId: 1, status: 1 });
export const DentalProcedureModel = model('DentalProcedure', DentalProcedureSchema);
