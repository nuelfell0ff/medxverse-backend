import mongoose, { Schema } from 'mongoose';
import { BillingCaptureStatus, TriagePriority, ConsultationStatus, } from './outpatient.types.js';
const VitalSignsSchema = new Schema({
    temperature: { type: Number },
    bloodPressureSystolic: { type: Number },
    bloodPressureDiastolic: { type: Number },
    pulseRate: { type: Number },
    respiratoryRate: { type: Number },
    oxygenSaturation: { type: Number },
    height: { type: Number },
    weight: { type: Number },
    bmi: { type: Number },
}, { _id: false });
const OutpatientBillingSchema = new Schema({
    status: {
        type: String,
        enum: Object.values(BillingCaptureStatus),
        default: BillingCaptureStatus.NOT_ATTEMPTED,
    },
    chargeId: {
        type: Schema.Types.ObjectId,
        ref: 'BillingCharge',
    },
    serviceCode: {
        type: String,
        trim: true,
        uppercase: true,
    },
    catalogueItemId: { type: Schema.Types.ObjectId, ref: 'PricingCatalogue' },
    cataloguePlanName: { type: String, trim: true },
    cataloguePrice: { type: Number, min: 0 },
    catalogueVersion: { type: Number, min: 1 },
    catalogueCurrency: { type: String, trim: true, uppercase: true },
    error: {
        type: String,
        trim: true,
    },
    capturedAt: {
        type: Date,
    },
}, { _id: false });
const OutpatientSchema = new Schema({
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
    doctorId: {
        type: Schema.Types.ObjectId,
        ref: 'Staff',
        index: true,
    },
    departmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Department',
    },
    triagePriority: {
        type: String,
        enum: Object.values(TriagePriority),
        default: TriagePriority.STANDARD,
        required: true,
    },
    status: {
        type: String,
        enum: Object.values(ConsultationStatus),
        default: ConsultationStatus.IN_QUEUE,
        required: true,
        index: true,
    },
    chiefComplaint: {
        type: String,
        required: true,
        trim: true,
    },
    vitalSigns: {
        type: VitalSignsSchema,
    },
    nursingNotes: {
        type: String,
        trim: true,
    },
    consultationNotes: {
        type: String,
        trim: true,
    },
    diagnoses: [
        {
            type: String,
            trim: true,
        },
    ],
    queuedAt: {
        type: Date,
        default: Date.now,
        required: true,
    },
    consultationStartedAt: {
        type: Date,
    },
    consultationEndedAt: {
        type: Date,
    },
    pricingCatalogueItemId: { type: Schema.Types.ObjectId, ref: 'PricingCatalogue' },
    pricingCataloguePlanName: { type: String, trim: true },
    pricingCataloguePrice: { type: Number, min: 0 },
    pricingCatalogueVersion: { type: Number, min: 1 },
    pricingCatalogueCurrency: { type: String, trim: true, uppercase: true },
    billing: {
        type: OutpatientBillingSchema,
        default: () => ({
            status: BillingCaptureStatus.NOT_ATTEMPTED,
            serviceCode: 'OUTPATIENT_CONSULTATION',
        }),
    },
}, { timestamps: true });
OutpatientSchema.index({
    hospitalId: 1,
    status: 1,
    queuedAt: 1,
});
OutpatientSchema.index({
    hospitalId: 1,
    'billing.status': 1,
});
export const OutpatientModel = mongoose.models.Outpatient ||
    mongoose.model('Outpatient', OutpatientSchema);
