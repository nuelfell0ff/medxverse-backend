import { Schema, model } from 'mongoose';
import { ImagingModality, RadiologyOrderStatus, PriorityLevel, } from './radiology.types.js';
const PacsMetadataSchema = new Schema({
    studyInstanceUid: { type: String, trim: true },
    seriesInstanceUid: { type: String, trim: true },
    imageCount: { type: Number, default: 0 },
    dicomViewerUrl: { type: String, trim: true },
    dicomFileKeys: [{ type: String, trim: true }],
}, { _id: false });
const RadiologyOrderSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    orderingDoctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    radiologistId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    modality: {
        type: String,
        enum: Object.values(ImagingModality),
        required: true,
        index: true,
    },
    procedureName: { type: String, required: true, trim: true },
    bodyPart: { type: String, required: true, trim: true },
    clinicalIndication: { type: String, required: true, trim: true },
    priority: {
        type: String,
        enum: Object.values(PriorityLevel),
        default: PriorityLevel.ROUTINE,
        required: true,
    },
    status: {
        type: String,
        enum: Object.values(RadiologyOrderStatus),
        default: RadiologyOrderStatus.REQUESTED,
        required: true,
        index: true,
    },
    pacsMetadata: { type: PacsMetadataSchema },
    findings: { type: String, trim: true },
    impression: { type: String, trim: true },
    radiologistNotes: { type: String, trim: true },
    reportedAt: { type: Date },
    cancellationReason: { type: String, trim: true },
}, { timestamps: true });
RadiologyOrderSchema.index({ hospitalId: 1, modality: 1, status: 1 });
export const RadiologyOrderModel = model('RadiologyOrder', RadiologyOrderSchema);
