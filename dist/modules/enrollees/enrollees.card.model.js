import mongoose, { Schema } from 'mongoose';
const cardSchema = new Schema({
    hmoId: { type: Schema.Types.ObjectId, required: true, index: true },
    enrolleeId: { type: Schema.Types.ObjectId, required: true, index: true },
    cardNumber: { type: String, required: true, trim: true, uppercase: true },
    status: { type: String, enum: ['ACTIVE', 'REVOKED', 'EXPIRED'], default: 'ACTIVE', required: true, index: true },
    issuedAt: { type: Date, required: true },
    expiresAt: { type: Date },
}, { timestamps: true });
cardSchema.index({ hmoId: 1, cardNumber: 1 }, { unique: true });
cardSchema.index({ hmoId: 1, enrolleeId: 1, status: 1 });
const existing = mongoose.models.EnrolleeCard;
export const EnrolleeCardModel = existing ?? mongoose.model('EnrolleeCard', cardSchema);
