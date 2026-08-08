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
const ClaimSchema = new Schema({
    hmoId: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
        index: true,
    },
    claimNumber: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
    },
    memberId: {
        type: Schema.Types.ObjectId,
        ref: 'HMSMember',
        required: true,
        index: true,
    },
    providerId: {
        type: Schema.Types.ObjectId,
        ref: 'Provider',
        required: true,
        index: true,
    },
    diagnosis: {
        type: String,
        required: true,
        trim: true,
    },
    icdCode: {
        type: String,
        trim: true,
        uppercase: true,
    },
    treatmentDate: {
        type: Date,
        required: true,
    },
    submissionDate: {
        type: Date,
        default: Date.now,
    },
    items: {
        type: [ClaimItemSchema],
        validate: [
            (val) => val.length > 0,
            'Claim must contain at least one item',
        ],
    },
    totalClaimedAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    totalApprovedAmount: {
        type: Number,
        min: 0,
    },
    status: {
        type: String,
        enum: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED'],
        default: 'SUBMITTED',
        index: true,
    },
    rejectionReason: {
        type: String,
        trim: true,
    },
    adjudicatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    adjudicatedAt: {
        type: Date,
    },
    notes: {
        type: String,
        trim: true,
    },
}, { timestamps: true });
ClaimSchema.index({ hmoId: 1, claimNumber: 1 }, { unique: true });
ClaimSchema.index({ hmoId: 1, status: 1 });
ClaimSchema.index({ hmoId: 1, memberId: 1 });
ClaimSchema.index({ hmoId: 1, providerId: 1 });
export const ClaimModel = mongoose.models.HMSClaim || model('HMSClaim', ClaimSchema);
