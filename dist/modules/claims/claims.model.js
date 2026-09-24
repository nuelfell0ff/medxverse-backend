import mongoose, { Schema, model } from 'mongoose';
const ClaimItemSchema = new Schema({
    code: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
        type: String,
        enum: ['PROCEDURE', 'DRUG', 'LAB_TEST', 'CONSULTATION', 'ACCOMMODATION', 'OTHER'],
        required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    claimedAmount: { type: Number, required: true, min: 0 },
    approvedAmount: { type: Number, min: 0 },
}, { _id: false });
const ClaimEventSchema = new Schema({
    type: {
        type: String,
        enum: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED', 'APPEAL_SUBMITTED', 'ADJUSTED'],
        required: true,
    },
    fromStatus: { type: String },
    toStatus: { type: String },
    actorId: { type: Schema.Types.ObjectId, ref: 'Account' },
    reason: { type: String, trim: true },
    notes: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
}, { _id: false });
const AppealSchema = new Schema({
    reason: { type: String, required: true, trim: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    submittedAt: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['PENDING', 'UPHELD', 'OVERTURNED'],
        default: 'PENDING',
    },
    resolution: { type: String, trim: true },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'Account' },
    resolvedAt: { type: Date },
}, { _id: true });
const AdjustmentSchema = new Schema({
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true },
    adjustedBy: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    adjustedAt: { type: Date, default: Date.now },
}, { _id: true });
const ClaimSchema = new Schema({
    hmoId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    claimNumber: { type: String, required: true, trim: true, uppercase: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'HMSMember', required: true, index: true },
    providerId: { type: Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
    preAuthorizationId: { type: String, trim: true, index: true },
    diagnosis: { type: String, required: true, trim: true },
    icdCode: { type: String, trim: true, uppercase: true },
    treatmentDate: { type: Date, required: true },
    submissionDate: { type: Date, default: Date.now },
    items: {
        type: [ClaimItemSchema],
        validate: {
            validator: (val) => Array.isArray(val) && val.length > 0,
            message: 'Claim must contain at least one item',
        },
    },
    totalClaimedAmount: { type: Number, required: true, min: 0 },
    totalApprovedAmount: { type: Number, min: 0 },
    adjustedAmount: { type: Number, min: 0, default: 0 },
    payableAmount: { type: Number, min: 0 },
    status: {
        type: String,
        enum: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED'],
        default: 'SUBMITTED',
        index: true,
    },
    rejectionReason: { type: String, trim: true },
    adjudicatedBy: { type: Schema.Types.ObjectId, ref: 'Account' },
    adjudicatedAt: { type: Date },
    notes: { type: String, trim: true },
    duplicateRisk: { type: Boolean, default: false, index: true },
    duplicateOf: { type: Schema.Types.ObjectId, ref: 'HMSClaim' },
    events: { type: [ClaimEventSchema], default: [] },
    appeals: { type: [AppealSchema], default: [] },
    adjustments: { type: [AdjustmentSchema], default: [] },
}, { timestamps: true });
ClaimSchema.index({ hmoId: 1, claimNumber: 1 }, { unique: true });
ClaimSchema.index({ hmoId: 1, status: 1, createdAt: -1 });
ClaimSchema.index({ hmoId: 1, memberId: 1, createdAt: -1 });
ClaimSchema.index({ hmoId: 1, providerId: 1, createdAt: -1 });
ClaimSchema.index({ hmoId: 1, treatmentDate: -1 });
ClaimSchema.index({ hmoId: 1, preAuthorizationId: 1 });
export const ClaimModel = mongoose.models.HMSClaim || model('HMSClaim', ClaimSchema);
