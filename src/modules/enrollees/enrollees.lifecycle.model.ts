import mongoose, { Model, Schema, HydratedDocument } from 'mongoose';

export interface IEnrolleeLifecycleEvent {
  hmoId: mongoose.Types.ObjectId;
  enrolleeId: mongoose.Types.ObjectId;
  type: string;
  fromStatus?: string;
  toStatus?: string;
  reason?: string;
  actorId?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type EnrolleeLifecycleDocument = HydratedDocument<IEnrolleeLifecycleEvent>;

const lifecycleSchema = new Schema<IEnrolleeLifecycleEvent>({
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
const existing = mongoose.models.EnrolleeLifecycle as Model<IEnrolleeLifecycleEvent> | undefined;
export const EnrolleeLifecycleModel = existing ?? mongoose.model<IEnrolleeLifecycleEvent>('EnrolleeLifecycle', lifecycleSchema);
