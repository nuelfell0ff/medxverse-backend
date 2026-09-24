import mongoose, { Schema } from 'mongoose';
const lifecycleSchema = new Schema({
    hmoId: { type: Schema.Types.ObjectId, required: true, index: true },
    enrolleeId: { type: Schema.Types.ObjectId, required: true, index: true },
    type: { type: String, required: true, index: true },
    fromStatus: { type: String },
    toStatus: { type: String },
    reason: { type: String, trim: true, maxlength: 1000 },
    actorId: { type: Schema.Types.ObjectId },
    metadata: { type: Schema.Types.Mixed },
}, { timestamps: true });
lifecycleSchema.index({ hmoId: 1, enrolleeId: 1, createdAt: -1 });
const existing = mongoose.models.EnrolleeLifecycle;
export const EnrolleeLifecycleModel = existing ?? mongoose.model('EnrolleeLifecycle', lifecycleSchema);
