import { Schema, model } from 'mongoose';
import { ThemeMode, IntegrationType, IntegrationStatus, } from './settings.types.js';
const HospitalSettingsSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, unique: true, index: true },
    profile: {
        name: { type: String, required: true, trim: true },
        tagline: { type: String, trim: true },
        taxId: { type: String, trim: true },
        registrationNumber: { type: String, trim: true },
        email: { type: String, required: true, trim: true, lowercase: true },
        phone: { type: String, required: true, trim: true },
        website: { type: String, trim: true },
        address: {
            street: { type: String, required: true, trim: true },
            city: { type: String, required: true, trim: true },
            state: { type: String, required: true, trim: true },
            country: { type: String, required: true, trim: true },
            postalCode: { type: String, trim: true },
        },
    },
    branding: {
        logoUrl: { type: String, trim: true },
        faviconUrl: { type: String, trim: true },
        primaryColor: { type: String, default: '#1e40af' },
        secondaryColor: { type: String, default: '#0891b2' },
        accentColor: { type: String, default: '#f59e0b' },
    },
    defaultLanguage: { type: String, default: 'en' },
    timeZone: { type: String, default: 'UTC' },
    currency: { type: String, default: 'USD' },
    theme: { type: String, enum: Object.values(ThemeMode), default: ThemeMode.LIGHT },
    updatedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
export const HospitalSettingsModel = model('HospitalSettings', HospitalSettingsSchema);
const ClinicalTemplateSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, index: true, trim: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', index: true },
    content: { type: String, required: true },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });
export const ClinicalTemplateModel = model('ClinicalTemplate', ClinicalTemplateSchema);
const SystemIntegrationSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: Object.values(IntegrationType), required: true, index: true },
    status: {
        type: String,
        enum: Object.values(IntegrationStatus),
        default: IntegrationStatus.INACTIVE,
        index: true,
    },
    apiKey: { type: String, select: false },
    apiSecret: { type: String, select: false },
    baseUrl: { type: String, trim: true },
    configOptions: { type: Schema.Types.Mixed },
    lastSyncedAt: { type: Date },
}, { timestamps: true });
export const SystemIntegrationModel = model('SystemIntegration', SystemIntegrationSchema);
