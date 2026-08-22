import mongoose, { Schema, model } from 'mongoose';

import {
  ILabOrderDocument,
  ITestCatalogDocument,
  LabOrderStatus,
  LabPriority,
  LabDepartment,
  ResultFlag,
  SpecimenQuality,
  EntryMethod,
  SampleRoutingStatus,
  AuthorizationLevel,
} from './lab.types.js';

/* =========================================================
   RESULT FIELD
========================================================= */

const LabResultFieldSchema = new Schema(
  {
    parameterName: {
      type: String,
      required: true,
      trim: true,
    },

    value: {
      type: String,
      required: true,
      trim: true,
    },

    unit: {
      type: String,
      trim: true,
    },

    referenceRange: {
      type: String,
      trim: true,
    },

    ageSexSpecificRange: {
      type: String,
      trim: true,
    },

    flag: {
      type: String,
      enum: Object.values(ResultFlag),
      default: ResultFlag.NORMAL,
    },

    previousValue: {
      type: String,
      trim: true,
    },

    deltaPercentage: {
      type: Number,
    },

    entryMethod: {
      type: String,
      enum: Object.values(EntryMethod),
      default: EntryMethod.MANUAL,
    },

    analyzerName: {
      type: String,
      trim: true,
    },

    analyzerResultId: {
      type: String,
      trim: true,
    },

    isRepeat: {
      type: Boolean,
      default: false,
    },

    repeatReason: {
      type: String,
      trim: true,
    },

    dilutionFactor: {
      type: Number,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   CHAIN OF CUSTODY
========================================================= */

const ChainOfCustodySchema = new Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
    },

    action: {
      type: String,
      required: true,
      trim: true,
    },

    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },

    location: {
      type: String,
      trim: true,
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   SAMPLE REJECTION
========================================================= */

const SpecimenRejectionSchema = new Schema(
  {
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    quality: {
      type: String,
      enum: Object.values(SpecimenQuality),
      required: true,
    },

    rejectionDate: {
      type: Date,
      default: Date.now,
    },

    recollectionRequested: {
      type: Boolean,
      default: true,
    },

    recollectionScheduledAt: {
      type: Date,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   SAMPLE ROUTING
========================================================= */

const SampleRoutingSchema = new Schema(
  {
    department: {
      type: String,
      enum: Object.values(LabDepartment),
      required: true,
    },

    routedAt: {
      type: Date,
    },

    routedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
    },

    receivedAt: {
      type: Date,
    },

    receivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
    },

    location: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: Object.values(SampleRoutingStatus),
      default: SampleRoutingStatus.PENDING,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   RESULT AUTHORIZATION
========================================================= */

const ResultAuthorizationSchema = new Schema(
  {
    level: {
      type: String,
      enum: Object.values(AuthorizationLevel),
      required: true,
    },

    authorizedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },

    authorizedAt: {
      type: Date,
      default: Date.now,
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   RESULT AMENDMENT
========================================================= */

const ResultAmendmentSchema = new Schema(
  {
    amendedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },

    amendedAt: {
      type: Date,
      default: Date.now,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    previousResults: {
      type: [LabResultFieldSchema],
      default: [],
    },

    newResults: {
      type: [LabResultFieldSchema],
      default: [],
    },

    version: {
      type: Number,
      required: true,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   REPEAT TEST
========================================================= */

const RepeatTestSchema = new Schema(
  {
    repeatedAt: {
      type: Date,
      default: Date.now,
    },

    repeatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    parameterNames: {
      type: [String],
      default: [],
    },

    dilutionFactor: {
      type: Number,
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   REFLEX TEST
========================================================= */

const ReflexTestSchema = new Schema(
  {
    triggeredAt: {
      type: Date,
      default: Date.now,
    },

    triggeredBy: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
    },

    ruleName: {
      type: String,
      required: true,
      trim: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    triggeredTestName: {
      type: String,
      required: true,
      trim: true,
    },

    triggeredOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'LabOrder',
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   LAB ORDER
========================================================= */

const LabOrderSchema = new Schema<ILabOrderDocument>(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },

    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },

    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },

    consultationId: {
      type: Schema.Types.ObjectId,
      ref: 'Consultation',
      index: true,
    },

    accessionNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    barcodeUrl: {
      type: String,
      trim: true,
    },

    qrCodeUrl: {
      type: String,
      trim: true,
    },

    testCatalogId: {
      type: Schema.Types.ObjectId,
      ref: 'TestCatalog',
    },

    testName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    testCategory: {
      type: String,
      enum: Object.values(LabDepartment),
      required: true,
      index: true,
    },

    panelName: {
      type: String,
      trim: true,
    },

    priority: {
      type: String,
      enum: Object.values(LabPriority),
      default: LabPriority.ROUTINE,
      index: true,
    },

    isStat: {
      type: Boolean,
      default: false,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(LabOrderStatus),
      default: LabOrderStatus.PENDING,
      required: true,
      index: true,
    },

    sampleType: {
      type: String,
      required: true,
      trim: true,
    },

    sampleCollectionScheduledAt: {
      type: Date,
    },

    sampleCollectedAt: {
      type: Date,
    },

    phlebotomistId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
    },

    specimenQuality: {
      type: String,
      enum: Object.values(SpecimenQuality),
    },

    specimenReceivedAt: {
      type: Date,
    },

    sampleRouting: {
      type: SampleRoutingSchema,
    },

    chainOfCustody: {
      type: [ChainOfCustodySchema],
      default: [],
    },

    rejectionInfo: {
      type: SpecimenRejectionSchema,
    },

    results: {
      type: [LabResultFieldSchema],
      default: [],
    },

    labTechnicianId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
    },

    verifierId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
    },

    verifiedAt: {
      type: Date,
    },

    authorizedAt: {
      type: Date,
    },

    completedAt: {
      type: Date,
    },

    authorizationHistory: {
      type: [ResultAuthorizationSchema],
      default: [],
    },

    version: {
      type: Number,
      default: 1,
    },

    amendmentHistory: {
      type: [ResultAmendmentSchema],
      default: [],
    },

    repeatTests: {
      type: [RepeatTestSchema],
      default: [],
    },

    reflexTests: {
      type: [ReflexTestSchema],
      default: [],
    },

    aiPatternAlerts: {
      type: [String],
      default: [],
    },

    deltaCheckTriggered: {
      type: Boolean,
      default: false,
    },

    criticalResultNotified: {
      type: Boolean,
      default: false,
    },

    duplicateTestDetected: {
      type: Boolean,
      default: false,
    },

    duplicateTestMessage: {
      type: String,
      trim: true,
    },

    predictedTatMinutes: {
      type: Number,
      min: 0,
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

/* =========================================================
   INDEXES
========================================================= */

LabOrderSchema.index({
  hospitalId: 1,
  status: 1,
  priority: 1,
});

LabOrderSchema.index({
  hospitalId: 1,
  patientId: 1,
  createdAt: -1,
});

LabOrderSchema.index({
  hospitalId: 1,
  testCategory: 1,
  status: 1,
});

LabOrderSchema.index({
  hospitalId: 1,
  isStat: -1,
  createdAt: -1,
});

/* =========================================================
   TEST CATALOG
========================================================= */

const TestCatalogParameterSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    unit: {
      type: String,
      trim: true,
    },

    defaultRefRange: {
      type: String,
      trim: true,
    },

    criticalLow: {
      type: Number,
    },

    criticalHigh: {
      type: Number,
    },
  },
  {
    _id: false,
  }
);

const TestCatalogSchema = new Schema<ITestCatalogDocument>(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },

    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    department: {
      type: String,
      enum: Object.values(LabDepartment),
      required: true,
      index: true,
    },

    sampleType: {
      type: String,
      required: true,
      trim: true,
    },

    parameters: {
      type: [TestCatalogParameterSchema],
      default: [],
    },

    isPanel: {
      type: Boolean,
      default: false,
    },

    panelTests: {
      type: [String],
      default: [],
    },

    estimatedTatMinutes: {
      type: Number,
      min: 0,
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

TestCatalogSchema.index(
  {
    hospitalId: 1,
    code: 1,
  },
  {
    unique: true,
  }
);

/* =========================================================
   MODELS
========================================================= */

// Use mongoose.models because `models` is not available
// as a named ESM export in your Mongoose installation.

export const LabOrderModel =
  mongoose.models.LabOrder ||
  model<ILabOrderDocument>('LabOrder', LabOrderSchema);

export const TestCatalogModel =
  mongoose.models.TestCatalog ||
  model<ITestCatalogDocument>('TestCatalog', TestCatalogSchema);