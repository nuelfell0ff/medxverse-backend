import mongoose, { Schema, Model } from 'mongoose';
import { randomUUID } from 'node:crypto';
import {
  DrugCategory, UnitOfMeasure, PrescriptionStatus, PrescriptionSource,
  ScreeningStatus, FormularyStatus, DispenseStatus, PharmacyBillingStatus,
  InventoryTransactionType, ControlledSubstanceAction,
  IInventoryItemDocument, IPrescriptionDocument, IDispenseRecordDocument,
  IFormularyEntryDocument, IInventoryTransactionDocument, IControlledSubstanceLogDocument,
} from './pharmacy.types.js';

const InventoryItemSchema = new Schema<IInventoryItemDocument>({
  hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
  name: { type: String, required: true, trim: true, index: true },
  genericName: { type: String, trim: true, index: true },
  strength: { type: String, trim: true },
  dosageForm: { type: String, trim: true },
  category: { type: String, enum: Object.values(DrugCategory), default: DrugCategory.OTHER, index: true },
  batchNumber: { type: String, required: true, trim: true },
  barcode: { type: String, trim: true, index: true },
  gtin: { type: String, trim: true, index: true },
  manufacturer: { type: String, trim: true },
  unitPrice: { type: Number, required: true, min: 0 },
  billingCode: { type: String, trim: true, uppercase: true, index: true },
  pricingCatalogueItemId: { type: Schema.Types.ObjectId, ref: 'PricingCatalogue' },
  quantityInStock: { type: Number, required: true, min: 0, default: 0 },
  reorderLevel: { type: Number, required: true, min: 0, default: 10 },
  unitOfMeasure: { type: String, enum: Object.values(UnitOfMeasure), default: UnitOfMeasure.TABLET },
  expiryDate: { type: Date, required: true, index: true },
  storageLocation: { type: String, trim: true },
  controlledSubstance: { type: Boolean, default: false, index: true },
  scheduleClass: { type: String, trim: true },
  isLowStock: { type: Boolean, default: false, index: true },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

InventoryItemSchema.pre('save', function () {
  this.isLowStock = this.quantityInStock <= this.reorderLevel;
});

const PrescriptionMedicationSchema = new Schema({
  inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem' },
  medicationName: { type: String, required: true, trim: true },
  genericName: { type: String, trim: true },
  strength: { type: String, trim: true },
  dosageForm: { type: String, trim: true },
  dose: { type: String, trim: true },
  route: { type: String, trim: true },
  frequency: { type: String, trim: true },
  duration: { type: String, trim: true },
  quantity: { type: Number, required: true, min: 1 },
  unitOfMeasure: { type: String, enum: Object.values(UnitOfMeasure) },
  instructions: { type: String, trim: true },
  barcode: { type: String, trim: true },
  substitutionAllowed: { type: Boolean, default: false },
}, { _id: false });

const PrescriptionSchema = new Schema<IPrescriptionDocument>({
  hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  prescriberId: { type: Schema.Types.ObjectId, ref: 'Account', index: true },
  prescriberName: { type: String, trim: true, index: true },
  prescriptionNumber: { type: String, required: true, unique: true, index: true, default: () => `RX-${Date.now()}-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}` },
  source: { type: String, enum: Object.values(PrescriptionSource), required: true },
  sourceRecordId: { type: Schema.Types.ObjectId, index: true },
  sourceSystem: { type: String, trim: true },
  department: { type: String, trim: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Encounter', index: true },
  status: { type: String, enum: Object.values(PrescriptionStatus), default: PrescriptionStatus.RECEIVED, index: true },
  medications: { type: [PrescriptionMedicationSchema], required: true },
  screeningStatus: { type: String, enum: Object.values(ScreeningStatus), default: ScreeningStatus.PENDING, index: true },
  screeningSummary: { type: String },
  requestedAt: { type: Date, default: Date.now, index: true },
  reviewedAt: Date,
  approvedAt: Date,
  cancelledAt: Date,
  notes: String,
}, { timestamps: true });

const DispenseItemSchema = new Schema({
  prescriptionMedicationIndex: { type: Number, required: true, min: 0 },
  inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  quantity: { type: Number, required: true, min: 1 },
  barcodeScanned: { type: String, required: true, trim: true },
  barcodeVerified: { type: Boolean, required: true },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  billingCode: String,
  pricingCatalogueItemId: { type: Schema.Types.ObjectId, ref: 'PricingCatalogue' },
  pricingCataloguePlanName: String,
  pricingCataloguePrice: { type: Number, min: 0 },
  pricingCatalogueCurrency: String,
  pricingCatalogueVersion: { type: Number, min: 1 },
  billingChargeId: { type: Schema.Types.ObjectId, ref: 'BillingCharge' },
  billingUnitPrice: { type: Number, min: 0 },
  billingCurrency: String,
  billingCatalogueVersion: { type: Number, min: 1 },
  billingError: String,
}, { _id: false });

const DispenseRecordSchema = new Schema<IDispenseRecordDocument>({
  hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  prescriptionId: { type: Schema.Types.ObjectId, ref: 'Prescription', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Encounter', index: true },
  consultationId: { type: Schema.Types.ObjectId, ref: 'Consultation', index: true },
  dispensedBy: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
  secondVerifierId: { type: Schema.Types.ObjectId, ref: 'Account' },
  items: { type: [DispenseItemSchema], required: true },
  totalAmount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: Object.values(DispenseStatus), default: DispenseStatus.DISPENSED, index: true },
  screeningStatus: { type: String, enum: Object.values(ScreeningStatus), required: true },
  emarReferenceId: { type: Schema.Types.ObjectId },
  notes: String,
  billingStatus: { type: String, enum: Object.values(PharmacyBillingStatus), default: PharmacyBillingStatus.NOT_ATTEMPTED, index: true },
  billingChargeId: { type: Schema.Types.ObjectId, ref: 'BillingCharge' },
  billingChargeIds: { type: [{ type: Schema.Types.ObjectId, ref: 'BillingCharge' }], default: [] },
  billingErrors: { type: [String], default: [] },
  billingCapturedAt: Date,
}, { timestamps: true });

const FormularyEntrySchema = new Schema<IFormularyEntryDocument>({
  hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
  department: { type: String, trim: true, index: true },
  medicationName: { type: String, required: true, trim: true, index: true },
  genericName: { type: String, trim: true },
  inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem' },
  status: { type: String, enum: Object.values(FormularyStatus), default: FormularyStatus.APPROVED, index: true },
  substitutionAllowed: { type: Boolean, default: false },
  substituteInventoryItemIds: { type: [Schema.Types.ObjectId], ref: 'InventoryItem', default: [] },
  restrictions: String,
  effectiveFrom: { type: Date, default: Date.now },
  effectiveTo: Date,
}, { timestamps: true });

const InventoryTransactionSchema = new Schema<IInventoryTransactionDocument>({
  hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
  inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true, index: true },
  type: { type: String, enum: Object.values(InventoryTransactionType), required: true },
  quantity: { type: Number, required: true },
  quantityBefore: { type: Number, required: true, min: 0 },
  quantityAfter: { type: Number, required: true, min: 0 },
  referenceType: String,
  referenceId: Schema.Types.ObjectId,
  performedBy: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  reason: { type: String, required: true, trim: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

const ControlledSubstanceLogSchema = new Schema<IControlledSubstanceLogDocument>({
  hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
  action: { type: String, enum: Object.values(ControlledSubstanceAction), required: true },
  prescriptionId: { type: Schema.Types.ObjectId, ref: 'Prescription', index: true },
  dispenseRecordId: { type: Schema.Types.ObjectId, ref: 'DispenseRecord', index: true },
  inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true, index: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', index: true },
  quantity: { type: Number, required: true, min: 1 },
  quantityBefore: { type: Number, required: true, min: 0 },
  quantityAfter: { type: Number, required: true, min: 0 },
  performedBy: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  secondVerifierId: { type: Schema.Types.ObjectId, ref: 'Account' },
  reason: { type: String, required: true },
  immutableHash: { type: String, required: true, index: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

InventoryItemSchema.index({ hospitalId: 1, barcode: 1 });
InventoryItemSchema.index({ hospitalId: 1, name: 1, batchNumber: 1 }, { unique: true });
PrescriptionSchema.index({ hospitalId: 1, patientId: 1, createdAt: -1 });
PrescriptionSchema.index({ hospitalId: 1, source: 1, sourceRecordId: 1 });
DispenseRecordSchema.index({ hospitalId: 1, patientId: 1, createdAt: -1 });
FormularyEntrySchema.index({ hospitalId: 1, department: 1, medicationName: 1 });
InventoryTransactionSchema.index({ hospitalId: 1, inventoryItemId: 1, createdAt: -1 });
ControlledSubstanceLogSchema.index({ hospitalId: 1, createdAt: -1 });

export const InventoryItemModel: Model<IInventoryItemDocument> = (mongoose.models.InventoryItem as Model<IInventoryItemDocument>) || mongoose.model<IInventoryItemDocument>('InventoryItem', InventoryItemSchema);
export const PrescriptionModel: Model<IPrescriptionDocument> = (mongoose.models.Prescription as Model<IPrescriptionDocument>) || mongoose.model<IPrescriptionDocument>('Prescription', PrescriptionSchema);
export const DispenseRecordModel: Model<IDispenseRecordDocument> = (mongoose.models.DispenseRecord as Model<IDispenseRecordDocument>) || mongoose.model<IDispenseRecordDocument>('DispenseRecord', DispenseRecordSchema);
export const FormularyEntryModel: Model<IFormularyEntryDocument> = (mongoose.models.FormularyEntry as Model<IFormularyEntryDocument>) || mongoose.model<IFormularyEntryDocument>('FormularyEntry', FormularyEntrySchema);
export const InventoryTransactionModel: Model<IInventoryTransactionDocument> = (mongoose.models.InventoryTransaction as Model<IInventoryTransactionDocument>) || mongoose.model<IInventoryTransactionDocument>('InventoryTransaction', InventoryTransactionSchema);
export const ControlledSubstanceLogModel: Model<IControlledSubstanceLogDocument> = (mongoose.models.ControlledSubstanceLog as Model<IControlledSubstanceLogDocument>) || mongoose.model<IControlledSubstanceLogDocument>('ControlledSubstanceLog', ControlledSubstanceLogSchema);
