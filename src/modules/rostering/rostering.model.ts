import mongoose, {
  Document,
  Model,
  Schema,
  Types,
} from 'mongoose';

import {
  AssignmentStatus,
  RosterAreaType,
  RosterStatus,
  ShiftStatus,
  ShiftType,
} from './rostering.types.js';

/* =========================================================
   ASSIGNMENT SCHEMA
========================================================= */

const ShiftAssignmentSchema = new Schema(
  {
    staffId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: 'Staff',
    },

    role: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: Object.values(AssignmentStatus),
      default: AssignmentStatus.PENDING,
    },

    acceptedAt: Date,

    declinedAt: Date,

    notes: {
      type: String,
      trim: true,
    },

    assignedAt: {
      type: Date,
      default: Date.now,
    },

    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
    },
  },
  {
    _id: true,
  }
);

/* =========================================================
   SHIFT SCHEMA
========================================================= */

const ShiftSchema = new Schema(
  {
    date: {
      type: Date,
      required: true,
      index: true,
    },

    startTime: {
      type: String,
      required: true,
      trim: true,
    },

    endTime: {
      type: String,
      required: true,
      trim: true,
    },

    shiftType: {
      type: String,
      enum: Object.values(ShiftType),
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(ShiftStatus),
      default: ShiftStatus.OPEN,
    },

    areaType: {
      type: String,
      enum: Object.values(RosterAreaType),
      required: true,
    },

    departmentId: {
      type: Schema.Types.ObjectId,
    },

    departmentName: {
      type: String,
      trim: true,
    },

    wardId: {
      type: Schema.Types.ObjectId,
    },

    wardName: {
      type: String,
      trim: true,
    },

    location: {
      type: String,
      trim: true,
    },

    requiredStaffCount: {
      type: Number,
      min: 0,
      default: 1,
    },

    notes: {
      type: String,
      trim: true,
    },

    isOpenShift: {
      type: Boolean,
      default: true,
      index: true,
    },

    assignedStaff: {
      type: [ShiftAssignmentSchema] as any,
      default: [],
    },
  },
  {
    _id: true,
    timestamps: true,
  }
);

/* =========================================================
   ROSTER DOCUMENT
========================================================= */

export interface IRosterDocument extends Document {
  name: string;
  code?: string;
  description?: string;

  startDate: Date;
  endDate: Date;

  status: RosterStatus;

  areaType: RosterAreaType;

  departmentId?: Types.ObjectId;
  departmentName?: string;

  wardId?: Types.ObjectId;
  wardName?: string;

  isPublished: boolean;

  publishedAt?: Date;

  publishedBy?: Types.ObjectId;

  version: number;

  shifts: Types.DocumentArray<any>;

  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

/* =========================================================
   ROSTER SCHEMA
========================================================= */

const RosterSchema = new Schema<IRosterDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
    },

    startDate: {
      type: Date,
      required: true,
      index: true,
    },

    endDate: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(RosterStatus),
      default: RosterStatus.DRAFT,
      index: true,
    },

    areaType: {
      type: String,
      enum: Object.values(RosterAreaType),
      required: true,
      index: true,
    },

    departmentId: {
      type: Schema.Types.ObjectId,
      index: true,
    },

    departmentName: {
      type: String,
      trim: true,
    },

    wardId: {
      type: Schema.Types.ObjectId,
      index: true,
    },

    wardName: {
      type: String,
      trim: true,
    },

    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },

    publishedAt: Date,

    publishedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
    },

    version: {
      type: Number,
      default: 1,
      min: 1,
    },

    /*
     * The `as any` here is intentional.
     *
     * Some Mongoose versions have an incompatibility between
     * a typed parent Schema and an array containing another
     * Schema instance. Without this cast TypeScript throws:
     *
     * TS2322:
     * Type 'Schema<...>[]' is not assignable to
     * type 'SchemaDefinitionProperty<...>'
     *
     * The actual Mongoose schema and runtime validation remain
     * unchanged.
     */
    shifts: {
      type: [ShiftSchema] as any,
      default: [],
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
    },
  },
  {
    timestamps: true,
  }
);

/* =========================================================
   ROSTER INDEXES
========================================================= */

RosterSchema.index({
  startDate: 1,
  endDate: 1,
  areaType: 1,
});

RosterSchema.index({
  'shifts.date': 1,
  'shifts.shiftType': 1,
});

RosterSchema.index({
  'shifts.assignedStaff.staffId': 1,
});

/* =========================================================
   ROSTER MODEL
========================================================= */

export const RosterModel: Model<IRosterDocument> =
  mongoose.models.Roster ||
  mongoose.model<IRosterDocument>(
    'Roster',
    RosterSchema
  );

/* =========================================================
   STAFF AVAILABILITY
========================================================= */

const StaffAvailabilitySchema = new Schema(
  {
    staffId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Staff',
      index: true,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        'AVAILABLE',
        'UNAVAILABLE',
        'PREFERRED',
      ],
      required: true,
    },

    preferredShiftTypes: {
      type: [String],
      default: [],
    },

    availableFrom: {
      type: String,
      trim: true,
    },

    availableTo: {
      type: String,
      trim: true,
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

StaffAvailabilitySchema.index(
  {
    staffId: 1,
    date: 1,
  },
  {
    unique: true,
  }
);

/* =========================================================
   STAFF AVAILABILITY MODEL
========================================================= */

export const StaffAvailabilityModel =
  mongoose.models.StaffAvailability ||
  mongoose.model(
    'StaffAvailability',
    StaffAvailabilitySchema
  );

/* =========================================================
   SHIFT SWAPS
========================================================= */

const ShiftSwapSchema = new Schema(
  {
    shiftId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    requesterStaffId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Staff',
      index: true,
    },

    replacementStaffId: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      index: true,
    },

    reason: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        'PENDING',
        'APPROVED',
        'REJECTED',
        'CANCELLED',
      ],
      default: 'PENDING',
      index: true,
    },

    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
    },

    approvedAt: Date,

    rejectionReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

/* =========================================================
   SHIFT SWAP MODEL
========================================================= */

export const ShiftSwapModel =
  mongoose.models.ShiftSwap ||
  mongoose.model(
    'ShiftSwap',
    ShiftSwapSchema
  );

/* =========================================================
   SHIFT HANDOVERS
========================================================= */

const ShiftHandoverSchema = new Schema(
  {
    shiftId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    outgoingStaffId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Staff',
    },

    incomingStaffId: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
    },

    status: {
      type: String,
      enum: [
        'PENDING',
        'COMPLETED',
        'SKIPPED',
      ],
      default: 'PENDING',
    },

    summary: {
      type: String,
      trim: true,
    },

    pendingTasks: {
      type: [String],
      default: [],
    },

    importantNotes: {
      type: [String],
      default: [],
    },

    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

/* =========================================================
   SHIFT HANDOVER MODEL
========================================================= */

export const ShiftHandoverModel =
  mongoose.models.ShiftHandover ||
  mongoose.model(
    'ShiftHandover',
    ShiftHandoverSchema
  );