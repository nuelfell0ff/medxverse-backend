import mongoose, { Schema, model } from 'mongoose';
const emergencyContactSchema = new Schema({
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    relationship: { type: String, trim: true },
}, { _id: false });
const memberPortalProfileSchema = new Schema({
    hmoId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
    },
    memberId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
    },
    preferredLanguage: {
        type: String,
        default: 'en',
        trim: true,
    },
    preferredContactChannel: {
        type: String,
        enum: ['EMAIL', 'SMS', 'PHONE', 'PUSH'],
        default: 'EMAIL',
    },
    marketingConsent: {
        type: Boolean,
        default: false,
    },
    healthDataConsent: {
        type: Boolean,
        default: false,
    },
    emergencyContact: {
        type: emergencyContactSchema,
    },
}, {
    timestamps: true,
});
memberPortalProfileSchema.index({ hmoId: 1, memberId: 1 }, { unique: true });
const providerPortalProfileSchema = new Schema({
    hmoId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
    },
    providerId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
    },
    notificationEmail: {
        type: String,
        trim: true,
    },
    notificationPhone: {
        type: String,
        trim: true,
    },
    preferredContactChannel: {
        type: String,
        enum: ['EMAIL', 'SMS', 'PHONE', 'PUSH'],
        default: 'EMAIL',
    },
    claimsNotificationEnabled: {
        type: Boolean,
        default: true,
    },
    paymentNotificationEnabled: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});
providerPortalProfileSchema.index({ hmoId: 1, providerId: 1 }, { unique: true });
const notificationSchema = new Schema({
    hmoId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
    },
    recipientType: {
        type: String,
        enum: ['MEMBER', 'PROVIDER'],
        required: true,
    },
    recipientId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: [
            'GENERAL',
            'CLAIM',
            'PRE_AUTH',
            'BILLING',
            'ELIGIBILITY',
            'UTILIZATION',
            'SYSTEM',
        ],
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    message: {
        type: String,
        required: true,
        trim: true,
    },
    readAt: {
        type: Date,
    },
    metadata: {
        type: Schema.Types.Mixed,
    },
}, {
    timestamps: true,
});
notificationSchema.index({
    hmoId: 1,
    recipientType: 1,
    recipientId: 1,
    createdAt: -1,
});
/**
 * Reuse existing models during development/hot reload.
 *
 * `mongoose.models` works correctly with the ESM build,
 * whereas `models` is not available as a named export
 * in the current Mongoose runtime.
 */
export const MemberPortalProfileModel = mongoose.models.MemberPortalProfile ??
    model('MemberPortalProfile', memberPortalProfileSchema);
export const ProviderPortalProfileModel = mongoose.models.ProviderPortalProfile ??
    model('ProviderPortalProfile', providerPortalProfileSchema);
export const PortalNotificationModel = mongoose.models.PortalNotification ??
    model('PortalNotification', notificationSchema);
