import { Schema, model } from 'mongoose';
import { IDrugDocument, IDispenseRecordDocument } from './pharmacy.types.js';

const drugSchema = new Schema<IDrugDocument>(
  {
    name: {
      type: String,
      required: [true, 'Drug name is required'],
      trim: true,
      index: true,
    },
    genericName: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'ANALGESIC',
        'ANTIBIOTIC',
        'ANTIVIRAL',
        'ANTIHYPERTENSIVE',
        'ANTIDIABETIC',
        'ANTIHISTAMINE',
        'SUPPLEMENT',
        'OTHER',
      ],
      default: 'OTHER',
      index: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    batchNumber: {
      type: String,
      required: [true, 'Batch number is required'],
      trim: true,
    },
    quantityInStock: {
      type: Number,
      required: [true, 'Initial stock quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    reorderLevel: {
      type: Number,
      default: 10,
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Price cannot be negative'],
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    manufacturer: {
      type: String,
      trim: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

drugSchema.index({ name: 'text', genericName: 'text', sku: 'text' });

export const Drug = model<IDrugDocument>('Drug', drugSchema);

const dispensedItemSchema = new Schema(
  {
    drugId: {
      type: Schema.Types.ObjectId,
      ref: 'Drug',
      required: true,
    },
    drugName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const dispenseRecordSchema = new Schema<IDispenseRecordDocument>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient ID is required'],
      index: true,
    },
    opdVisitId: {
      type: Schema.Types.ObjectId,
      ref: 'OPDVisit',
      index: true,
    },
    dispensedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Pharmacist ID is required'],
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    items: {
      type: [dispensedItemSchema],
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'COVERED_BY_HMO'],
      default: 'PENDING',
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const DispenseRecord = model<IDispenseRecordDocument>(
  'DispenseRecord',
  dispenseRecordSchema
);