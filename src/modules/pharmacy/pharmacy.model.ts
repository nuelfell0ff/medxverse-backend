import mongoose, { Schema } from 'mongoose';
import {
  IMedicationDocument,
  IPrescriptionDocument,
  MedicationCategory,
  PrescriptionStatus,
} from './pharmacy.types.js';

// --- Stock Batch Schema ---
const StockBatchSchema = new Schema(
  {
    batchNumber: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    expiryDate: { type: Date, required: true },
    receivedDate: { type: Date, default: Date.now },
  },
  { _id: true }
);

// --- Medication Schema ---
const MedicationSchema = new Schema<IMedicationDocument>(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Hospital account ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Medication name is required'],
      trim: true,
    },
    genericName: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: Object.values(MedicationCategory),
      default: MedicationCategory.TABLET,
    },
    unit: {
      type: String,
      required: [true, 'Unit of measurement (e.g. tablet, bottle) is required'],
      trim: true,
    },
    minReorderLevel: {
      type: Number,
      default: 10,
    },
    batches: [StockBatchSchema],
    totalQuantity: {
      type: Number,
      default: 0,
    },
    sellingPricePerUnit: {
      type: Number,
      required: [true, 'Selling price per unit is required'],
      min: 0,
    },
    requiresPrescription: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

MedicationSchema.index({ hospitalId: 1, name: 1 }, { unique: true });

// Sync total quantity prior to save
MedicationSchema.pre('save', function (this: IMedicationDocument) {
  if (this.batches) {
    this.totalQuantity = this.batches.reduce((sum, batch) => sum + batch.quantity, 0);
  }
});

// --- Prescription Item Schema ---
const PrescriptionItemSchema = new Schema(
  {
    medicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Medication',
      required: true,
    },
    medicationName: { type: String, required: true },
    dosage: { type: String, required: true },
    frequency: { type: String, required: true },
    duration: { type: String, required: true },
    quantityPrescribed: { type: Number, required: true, min: 1 },
    quantityDispensed: { type: Number, default: 0, min: 0 },
    unitPrice: { type: Number, required: true },
    isDispensed: { type: Boolean, default: false },
  },
  { _id: true }
);

// --- Prescription Schema ---
const PrescriptionSchema = new Schema<IPrescriptionDocument>(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Hospital account ID is required'],
      index: true,
    },
    prescriptionNumber: {
      type: String,
      required: true,
      unique: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient ID is required'],
      index: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: [true, 'Doctor ID is required'],
      index: true,
    },
    ipdAdmissionId: {
      type: Schema.Types.ObjectId,
      ref: 'IpdAdmission',
    },
    items: [PrescriptionItemSchema],
    status: {
      type: String,
      enum: Object.values(PrescriptionStatus),
      default: PrescriptionStatus.PENDING,
      index: true,
    },
    notes: { type: String, trim: true },
    dispensedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
    dispensedAt: { type: Date },
  },
  { timestamps: true }
);

PrescriptionSchema.index({ hospitalId: 1, status: 1 });

export const Medication =
  mongoose.models.Medication ||
  mongoose.model<IMedicationDocument>('Medication', MedicationSchema);

export const Prescription =
  mongoose.models.Prescription ||
  mongoose.model<IPrescriptionDocument>('Prescription', PrescriptionSchema);