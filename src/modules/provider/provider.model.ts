import mongoose, { Model, Schema } from 'mongoose';
import {
  AccreditationStatus,
  IProviderDocument,
  ProviderContractStatus,
  ProviderPaymentModel,
  ProviderStatus,
  ProviderType,
} from './provider.types.js';

const addressSchema = new Schema({
  street: { type: String, trim: true, maxlength: 250 },
  city: { type: String, trim: true, maxlength: 120 },
  state: { type: String, trim: true, maxlength: 120 },
  country: { type: String, trim: true, maxlength: 120 },
  postalCode: { type: String, trim: true, maxlength: 30 },
}, { _id: false });

const contactSchema = new Schema({
  name: { type: String, trim: true, maxlength: 180 },
  phone: { type: String, trim: true, maxlength: 60 },
  email: { type: String, trim: true, lowercase: true, maxlength: 180 },
}, { _id: false });

const accreditationSchema = new Schema({
  status: { type: String, enum: Object.values(AccreditationStatus), default: AccreditationStatus.PENDING, required: true, index: true },
  number: { type: String, trim: true, uppercase: true, maxlength: 100 },
  authority: { type: String, trim: true, maxlength: 180 },
  issuedAt: { type: Date },
  expiresAt: { type: Date },
  notes: { type: String, trim: true, maxlength: 2000 },
}, { _id: false });

const contractSchema = new Schema({
  contractNumber: { type: String, trim: true, uppercase: true, maxlength: 100 },
  status: { type: String, enum: Object.values(ProviderContractStatus), default: ProviderContractStatus.DRAFT, required: true, index: true },
  startDate: { type: Date },
  endDate: { type: Date },
  paymentModel: { type: String, enum: Object.values(ProviderPaymentModel), default: ProviderPaymentModel.FEE_FOR_SERVICE, required: true },
  networkIds: { type: [String], default: [] },
  notes: { type: String, trim: true, maxlength: 2000 },
}, { _id: false });

const performanceSchema = new Schema({
  claimsCount: { type: Number, min: 0, default: 0 },
  approvedClaims: { type: Number, min: 0, default: 0 },
  rejectedClaims: { type: Number, min: 0, default: 0 },
  totalBilled: { type: Number, min: 0, default: 0 },
  totalApproved: { type: Number, min: 0, default: 0 },
  averageProcessingDays: { type: Number, min: 0 },
  utilizationCount: { type: Number, min: 0, default: 0 },
  lastCalculatedAt: { type: Date },
}, { _id: false });

const providerSchema = new Schema<IProviderDocument>({
  hmoId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
  code: { type: String, required: true, trim: true, uppercase: true, minlength: 2, maxlength: 60 },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 220 },
  type: { type: String, enum: Object.values(ProviderType), required: true, index: true },
  status: { type: String, enum: Object.values(ProviderStatus), default: ProviderStatus.PENDING, required: true, index: true },
  licenseNumber: { type: String, trim: true, uppercase: true, maxlength: 120 },
  taxId: { type: String, trim: true, uppercase: true, maxlength: 120 },
  specialty: { type: String, trim: true, maxlength: 180, index: true },
  phone: { type: String, trim: true, maxlength: 60 },
  email: { type: String, trim: true, lowercase: true, maxlength: 180 },
  website: { type: String, trim: true, maxlength: 250 },
  address: { type: addressSchema },
  primaryContact: { type: contactSchema },
  services: { type: [String], default: [] },
  accreditation: { type: accreditationSchema, required: true },
  contract: { type: contractSchema, required: true },
  networkIds: { type: [String], default: [] },
  tariffIds: { type: [Schema.Types.ObjectId], ref: 'ProviderTariff', default: [] },
  performance: { type: performanceSchema, required: true },
  notes: { type: String, trim: true, maxlength: 4000 },
}, { timestamps: true });

providerSchema.index({ hmoId: 1, code: 1 }, { unique: true });
providerSchema.index({ hmoId: 1, status: 1, type: 1 });
providerSchema.index({ hmoId: 1, 'accreditation.status': 1 });
providerSchema.index({ hmoId: 1, 'accreditation.expiresAt': 1 });
providerSchema.index({ hmoId: 1, name: 1 });
providerSchema.index({ hmoId: 1, networkIds: 1 });

const existing = mongoose.models.HMOProvider as Model<IProviderDocument> | undefined;
export const HMOProviderModel = existing ?? mongoose.model<IProviderDocument>('HMOProvider', providerSchema);
