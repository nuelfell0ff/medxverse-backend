import { Schema, model } from 'mongoose';
import { ProviderStatus, ProviderType } from './provider.types.js';
const ProviderSchema = new Schema({
    hmoId: { type: Schema.Types.ObjectId, required: true, ref: 'HMO', index: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: {
        type: String,
        enum: Object.values(ProviderType),
        default: ProviderType.PRIMARY,
    },
    status: {
        type: String,
        enum: Object.values(ProviderStatus),
        default: ProviderStatus.PENDING_APPROVAL,
    },
    tier: { type: String, trim: true },
    contact: {
        email: { type: String, required: true, lowercase: true, trim: true },
        phone: { type: String, required: true, trim: true },
        contactPerson: { type: String, trim: true },
    },
    address: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        country: { type: String, required: true, default: 'Nigeria' },
    },
    bankDetails: {
        bankName: { type: String, trim: true },
        accountNumber: { type: String, trim: true },
        accountName: { type: String, trim: true },
    },
}, { timestamps: true });
ProviderSchema.index({ hmoId: 1, code: 1 }, { unique: true });
ProviderSchema.index({ name: 'text', code: 'text' });
export const ProviderModel = model('Provider', ProviderSchema);
