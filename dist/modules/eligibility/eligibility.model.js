import mongoose, { Schema } from 'mongoose';
const EligibilityCheckSchema = new Schema({
    hmoId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'HMSMember', required: true, index: true },
    providerId: { type: Schema.Types.ObjectId, ref: 'HMOProvider', index: true },
    serviceCategory: { type: String, enum: ['OUTPATIENT', 'INPATIENT', 'MATERNITY', 'DENTAL', 'OPTICAL', 'SURGICAL', 'EMERGENCY', 'PHARMACY', 'PREVENTIVE'], required: true, index: true },
    serviceCode: { type: String, trim: true, uppercase: true },
    serviceDescription: { type: String, trim: true },
    serviceDate: { type: Date, required: true, index: true },
    requestedAmount: { type: Number, min: 0 },
    networkId: { type: String, trim: true },
    decision: { type: String, enum: ['ELIGIBLE', 'INELIGIBLE', 'PARTIAL'], required: true, index: true },
    eligible: { type: Boolean, required: true, index: true },
    reasons: { type: [String], default: [] },
    result: { type: Schema.Types.Mixed, required: true },
}, { timestamps: true });
EligibilityCheckSchema.index({ hmoId: 1, createdAt: -1 });
EligibilityCheckSchema.index({ hmoId: 1, memberId: 1, createdAt: -1 });
EligibilityCheckSchema.index({ hmoId: 1, providerId: 1, createdAt: -1 });
export const EligibilityCheckModel = mongoose.models.HMOEligibilityCheck ||
    mongoose.model('HMOEligibilityCheck', EligibilityCheckSchema);
