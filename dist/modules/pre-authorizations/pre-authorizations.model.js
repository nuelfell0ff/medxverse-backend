import mongoose, { Schema, model } from 'mongoose';
import { PreAuthStatus, PreAuthPriority, } from './pre-authorizations.types.js';
const ProcedureItemSchema = new Schema({
    code: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, required: true, trim: true },
    requestedAmount: { type: Number, required: true, min: 0 },
    approvedAmount: { type: Number, min: 0, default: 0 },
}, { _id: false });
const PreAuthSchema = new Schema({
    hmoId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    requestNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
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
    procedures: [ProcedureItemSchema],
    totalRequestedAmount: { type: Number, required: true, min: 0 },
    totalApprovedAmount: { type: Number, default: 0, min: 0 },
    clinicalNotes: { type: String, trim: true },
    decisionReason: { type: String, trim: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    expiresAt: { type: Date },
}, { timestamps: true });
PreAuthSchema.index({ hmoId: 1, status: 1 });
PreAuthSchema.index({ requestNumber: 'text', diagnosisDescription: 'text' });
export const PreAuthModel = mongoose.models.PreAuth || model('PreAuth', PreAuthSchema);
