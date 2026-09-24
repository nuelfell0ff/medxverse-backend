import mongoose, { Schema, model } from 'mongoose';
import { PreAuthPriority, PreAuthStatus, } from './pre-authorizations.types.js';
const ProcedureItemSchema = new Schema({
    code: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, required: true, trim: true },
    requestedAmount: { type: Number, required: true, min: 0 },
    approvedAmount: { type: Number, min: 0, default: 0 },
}, { _id: false });
const PreAuthHistorySchema = new Schema({
    status: { type: String, enum: Object.values(PreAuthStatus), required: true },
    reason: { type: String, trim: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'Account' },
    reviewedAt: { type: Date, required: true },
    totalApprovedAmount: { type: Number, required: true, min: 0 },
}, { _id: false });
const PreAuthSchema = new Schema({
    hmoId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    requestNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    authorizationCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true, index: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'HMSMember', required: true, index: true },
    providerId: { type: Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
    diagnosisCode: { type: String, required: true, trim: true, uppercase: true },
    diagnosisDescription: { type: String, required: true, trim: true },
    priority: {
        type: String,
        enum: Object.values(PreAuthPriority),
        default: PreAuthPriority.ROUTINE,
        index: true,
    },
    status: {
        type: String,
        enum: Object.values(PreAuthStatus),
        default: PreAuthStatus.NEW_REQUEST,
        index: true,
    },
    procedures: { type: [ProcedureItemSchema], required: true, default: [] },
    totalRequestedAmount: { type: Number, required: true, min: 0 },
    totalApprovedAmount: { type: Number, default: 0, min: 0 },
    clinicalNotes: { type: String, trim: true },
    decisionReason: { type: String, trim: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'Account' },
    reviewedAt: { type: Date },
    expiresAt: { type: Date },
    history: { type: [PreAuthHistorySchema], default: [] },
}, { timestamps: true });
PreAuthSchema.index({ hmoId: 1, status: 1 });
PreAuthSchema.index({ hmoId: 1, priority: 1 });
PreAuthSchema.index({ hmoId: 1, createdAt: -1 });
PreAuthSchema.index({ hmoId: 1, memberId: 1, createdAt: -1 });
PreAuthSchema.index({ hmoId: 1, providerId: 1, createdAt: -1 });
PreAuthSchema.index({ requestNumber: 'text', diagnosisDescription: 'text' });
export const PreAuthModel = mongoose.models.PreAuth || model('PreAuth', PreAuthSchema);
