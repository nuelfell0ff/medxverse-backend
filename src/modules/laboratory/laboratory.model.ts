import { Schema, model } from 'mongoose';
import { ILabTestCatalogDocument, ILabOrderDocument } from './laboratory.types.js';

const labTestCatalogSchema = new Schema<ILabTestCatalogDocument>(
  {
    name: {
      type: String,
      required: [true, 'Test name is required'],
      trim: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        'HAEMATOLOGY',
        'BIOCHEMISTRY',
        'MICROBIOLOGY',
        'PARASITOLOGY',
        'SEROLOGY',
        'PATHOLOGY',
        'OTHER',
      ],
      required: [true, 'Test category is required'],
      index: true,
    },
    price: {
      type: Number,
      required: [true, 'Test price is required'],
      min: [0, 'Price cannot be negative'],
    },
    sampleType: {
      type: String,
      required: [true, 'Sample type is required (e.g., Whole Blood, Serum, Urine)'],
      trim: true,
    },
    turnaroundTimeHours: {
      type: Number,
      default: 24,
    },
    referenceRange: {
      type: String,
      trim: true,
    },
    unit: {
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

labTestCatalogSchema.index({ name: 'text', code: 'text' });

export const LabTestCatalog = model<ILabTestCatalogDocument>(
  'LabTestCatalog',
  labTestCatalogSchema
);

const labResultParameterSchema = new Schema(
  {
    parameterName: { type: String, required: true },
    value: { type: String, required: true },
    unit: { type: String },
    referenceRange: { type: String },
    flag: {
      type: String,
      enum: ['NORMAL', 'ABNORMAL', 'CRITICAL'],
      default: 'NORMAL',
    },
  },
  { _id: false }
);

const labOrderItemSchema = new Schema(
  {
    testCatalogId: {
      type: Schema.Types.ObjectId,
      ref: 'LabTestCatalog',
      required: true,
    },
    testName: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
    },
    sampleCollectedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    parameters: [labResultParameterSchema],
    overallResult: {
      type: String,
    },
    remarks: {
      type: String,
    },
  },
  { _id: true }
);

const labOrderSchema = new Schema<ILabOrderDocument>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
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
    orderedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Ordering physician ID is required'],
      index: true,
    },
    labTechnicianId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    items: {
      type: [labOrderItemSchema],
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    priority: {
      type: String,
      enum: ['ROUTINE', 'URGENT', 'EMERGENCY'],
      default: 'ROUTINE',
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'COVERED_BY_HMO'],
      default: 'PENDING',
    },
    clinicalNotes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const LabOrder = model<ILabOrderDocument>('LabOrder', labOrderSchema);