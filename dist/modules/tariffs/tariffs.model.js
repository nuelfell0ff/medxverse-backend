import mongoose, { Schema, } from 'mongoose';
import { TariffCategory, TariffStatus, } from './tariffs.types.js';
/**
 * Provider-specific tariff rate.
 */
const providerRateSchema = new Schema({
    providerId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Provider',
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    notes: {
        type: String,
        trim: true,
    },
}, {
    _id: false,
});
/**
 * Main tariff schema.
 */
const tariffSchema = new Schema({
    hmoId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'HMO',
        index: true,
    },
    code: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    category: {
        type: String,
        enum: Object.values(TariffCategory),
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: Object.values(TariffStatus),
        required: true,
        default: TariffStatus.DRAFT,
        index: true,
    },
    baseAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    currency: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        default: 'NGN',
    },
    effectiveFrom: {
        type: Date,
        required: true,
        index: true,
    },
    effectiveTo: {
        type: Date,
    },
    unit: {
        type: String,
        trim: true,
        default: 'SERVICE',
    },
    providerRates: {
        type: [providerRateSchema],
        default: [],
    },
    requiresPreAuth: {
        type: Boolean,
        default: false,
    },
    notes: {
        type: String,
        trim: true,
    },
}, {
    timestamps: true,
});
/**
 * Indexes
 *
 * A tariff code must be unique within an HMO,
 * but the same code can exist under another HMO.
 */
tariffSchema.index({
    hmoId: 1,
    code: 1,
}, {
    unique: true,
});
tariffSchema.index({
    hmoId: 1,
    status: 1,
    category: 1,
});
tariffSchema.index({
    hmoId: 1,
    name: 1,
});
tariffSchema.index({
    hmoId: 1,
    effectiveFrom: 1,
    effectiveTo: 1,
});
/**
 * Reuse the existing model if it has already been registered.
 *
 * IMPORTANT:
 * We intentionally access `models` through the default mongoose
 * import instead of importing `models` as a named ESM export.
 *
 * This avoids:
 *
 * SyntaxError:
 * The requested module 'mongoose' does not provide an export named 'models'
 */
const existingTariffModel = mongoose.models.Tariff;
/**
 * Reuse the existing model during development/hot reloads.
 * Otherwise create the model from the schema.
 */
export const TariffModel = existingTariffModel ??
    mongoose.model('Tariff', tariffSchema);
