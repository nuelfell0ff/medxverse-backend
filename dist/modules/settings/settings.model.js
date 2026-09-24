import { Schema, model, } from 'mongoose';
const brandingSchema = new Schema({
    organizationName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
    },
    shortName: {
        type: String,
        trim: true,
        maxlength: 80,
    },
    logoUrl: {
        type: String,
        trim: true,
        maxlength: 1000,
    },
    primaryColor: {
        type: String,
        trim: true,
        maxlength: 20,
    },
    secondaryColor: {
        type: String,
        trim: true,
        maxlength: 20,
    },
    supportEmail: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 254,
    },
    supportPhone: {
        type: String,
        trim: true,
        maxlength: 40,
    },
}, {
    _id: false,
});
const addressSchema = new Schema({
    addressLine1: {
        type: String,
        trim: true,
        maxlength: 200,
    },
    addressLine2: {
        type: String,
        trim: true,
        maxlength: 200,
    },
    city: {
        type: String,
        trim: true,
        maxlength: 100,
    },
    state: {
        type: String,
        trim: true,
        maxlength: 100,
    },
    country: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
    },
    postalCode: {
        type: String,
        trim: true,
        maxlength: 30,
    },
}, {
    _id: false,
});
const claimsSchema = new Schema({
    autoAcknowledgeClaims: {
        type: Boolean,
        default: false,
    },
    requireDiagnosisCode: {
        type: Boolean,
        default: true,
    },
    requireProviderReference: {
        type: Boolean,
        default: true,
    },
    allowPartialApproval: {
        type: Boolean,
        default: true,
    },
}, {
    _id: false,
});
const preAuthorizationSchema = new Schema({
    enabled: {
        type: Boolean,
        default: true,
    },
    defaultValidityDays: {
        type: Number,
        min: 1,
        max: 365,
        default: 30,
    },
    requireClinicalNotes: {
        type: Boolean,
        default: true,
    },
    autoExpire: {
        type: Boolean,
        default: true,
    },
}, {
    _id: false,
});
const notificationSchema = new Schema({
    emailNotifications: {
        type: Boolean,
        default: true,
    },
    claimNotifications: {
        type: Boolean,
        default: true,
    },
    preAuthorizationNotifications: {
        type: Boolean,
        default: true,
    },
    systemNotifications: {
        type: Boolean,
        default: true,
    },
}, {
    _id: false,
});
const securitySchema = new Schema({
    sessionTimeoutMinutes: {
        type: Number,
        min: 5,
        max: 1440,
        default: 60,
    },
    maxLoginAttempts: {
        type: Number,
        min: 3,
        max: 20,
        default: 5,
    },
    requireStrongPasswords: {
        type: Boolean,
        default: true,
    },
}, {
    _id: false,
});
const settingsSchema = new Schema({
    hmoId: {
        type: Schema.Types.ObjectId,
        required: true,
        unique: true,
        index: true,
        ref: 'HMO',
    },
    branding: {
        type: brandingSchema,
        required: true,
    },
    address: {
        type: addressSchema,
        required: true,
    },
    currency: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        minlength: 3,
        maxlength: 3,
        default: 'NGN',
    },
    timezone: {
        type: String,
        required: true,
        trim: true,
        default: 'Africa/Lagos',
        maxlength: 100,
    },
    dateFormat: {
        type: String,
        required: true,
        trim: true,
        default: 'DD/MM/YYYY',
        maxlength: 30,
    },
    claims: {
        type: claimsSchema,
        required: true,
    },
    preAuthorization: {
        type: preAuthorizationSchema,
        required: true,
    },
    notifications: {
        type: notificationSchema,
        required: true,
    },
    security: {
        type: securitySchema,
        required: true,
    },
}, {
    timestamps: true,
    strict: true,
});
settingsSchema.index({ hmoId: 1 }, { unique: true });
export const HMOSettingsModel = model('HMOSettings', settingsSchema);
