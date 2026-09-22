import mongoose, { Model, Schema, HydratedDocument } from 'mongoose';

export type EnrolleeCardStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export interface IEnrolleeCard {
  hmoId: mongoose.Types.ObjectId;
  enrolleeId: mongoose.Types.ObjectId;
  cardNumber: string;
  status: EnrolleeCardStatus;
  issuedAt: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type EnrolleeCardDocument = HydratedDocument<IEnrolleeCard>;

const cardSchema = new Schema<IEnrolleeCard>({
  hmoId: { type: Schema.Types.ObjectId, required: true, index: true },
  enrolleeId: { type: Schema.Types.ObjectId, required: true, index: true },
  cardNumber: { type: String, required: true, trim: true, uppercase: true },
  status: { type: String, enum: ['ACTIVE', 'REVOKED', 'EXPIRED'], default: 'ACTIVE', required: true, index: true },
  issuedAt: { type: Date, required: true },
  expiresAt: { type: Date },
}, { timestamps: true });

cardSchema.index({ hmoId: 1, cardNumber: 1 }, { unique: true });
cardSchema.index({ hmoId: 1, enrolleeId: 1, status: 1 });

const existing = mongoose.models.EnrolleeCard as Model<IEnrolleeCard> | undefined;
export const EnrolleeCardModel = existing ?? mongoose.model<IEnrolleeCard>('EnrolleeCard', cardSchema);
