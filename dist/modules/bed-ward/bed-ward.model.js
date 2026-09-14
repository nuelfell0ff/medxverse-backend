import mongoose, { Schema, model } from 'mongoose';
import { AdmissionRequestSource, AssignmentStatus, BedStatus, BedStatusEventType, TransferRequestStatus, WardCleaningStatus, } from './bed-ward.types.js';
const WardSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    department: { type: String, trim: true, index: true },
    floor: { type: String, trim: true },
    building: { type: String, trim: true },
    specialty: { type: String, trim: true },
    active: { type: Boolean, default: true, index: true },
    cleaningStatus: { type: String, enum: Object.values(WardCleaningStatus), default: WardCleaningStatus.IDLE, index: true },
    cleaningStartedAt: Date,
    cleaningCompletedAt: Date,
    cleaningStartedById: { type: Schema.Types.ObjectId, ref: 'User' },
    cleaningCompletedById: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true },
}, { timestamps: true });
WardSchema.index({ hospitalId: 1, code: 1 }, { unique: true });
const BedSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    wardId: { type: Schema.Types.ObjectId, ref: 'Ward', required: true, index: true },
    bedNumber: { type: String, required: true, trim: true, uppercase: true },
    bedType: { type: String, required: true, trim: true, uppercase: true, index: true },
    status: { type: String, enum: Object.values(BedStatus), default: BedStatus.AVAILABLE, index: true },
    version: { type: Number, default: 0, min: 0 },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', index: true },
    admissionId: { type: Schema.Types.ObjectId, ref: 'InpatientAdmission', index: true },
    currentAssignmentId: { type: Schema.Types.ObjectId, ref: 'BedAssignment' },
    capabilities: { type: Map, of: Boolean, default: {} },
    supportedAcuityLevels: { type: [Number], default: [1, 2, 3, 4, 5] },
    genderRestriction: { type: String, trim: true },
    notes: { type: String, trim: true },
    lastOccupiedAt: Date,
    lastReleasedAt: Date,
    cleaningStartedAt: Date,
    cleaningCompletedAt: Date,
    blockedReason: { type: String, trim: true },
}, { timestamps: true });
BedSchema.index({ hospitalId: 1, wardId: 1, bedNumber: 1 }, { unique: true });
BedSchema.index({ hospitalId: 1, status: 1, wardId: 1 });
const BedAssignmentSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    bedId: { type: Schema.Types.ObjectId, ref: 'Bed', required: true, index: true },
    wardId: { type: Schema.Types.ObjectId, ref: 'Ward', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', index: true },
    admissionId: { type: Schema.Types.ObjectId, ref: 'InpatientAdmission', index: true },
    source: { type: String, enum: Object.values(AdmissionRequestSource) },
    status: { type: String, enum: Object.values(AssignmentStatus), default: AssignmentStatus.ACTIVE, index: true },
    reservedAt: Date,
    assignedAt: Date,
    releasedAt: Date,
    assignedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    releasedById: { type: Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, trim: true },
    requirements: { type: Schema.Types.Mixed },
}, { timestamps: true });
BedAssignmentSchema.index({ hospitalId: 1, bedId: 1, status: 1 });
BedAssignmentSchema.index({ hospitalId: 1, bedId: 1 }, { unique: true, partialFilterExpression: { status: { $in: [AssignmentStatus.RESERVED, AssignmentStatus.ACTIVE] } } });
const BedStatusEventSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    bedId: { type: Schema.Types.ObjectId, ref: 'Bed', required: true, index: true },
    wardId: { type: Schema.Types.ObjectId, ref: 'Ward', required: true, index: true },
    fromStatus: { type: String, enum: Object.values(BedStatus) },
    toStatus: { type: String, enum: Object.values(BedStatus), required: true },
    eventType: { type: String, enum: Object.values(BedStatusEventType), required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, trim: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient' },
    assignmentId: { type: Schema.Types.ObjectId, ref: 'BedAssignment' },
    occurredAt: { type: Date, default: Date.now, index: true },
    version: { type: Number, required: true },
    metadata: { type: Schema.Types.Mixed },
}, { timestamps: { createdAt: true, updatedAt: false } });
BedStatusEventSchema.index({ hospitalId: 1, bedId: 1, occurredAt: -1 });
const TransferRequestSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    fromWardId: { type: Schema.Types.ObjectId, ref: 'Ward' },
    fromBedId: { type: Schema.Types.ObjectId, ref: 'Bed' },
    toWardId: { type: Schema.Types.ObjectId, ref: 'Ward' },
    toBedId: { type: Schema.Types.ObjectId, ref: 'Bed' },
    requirements: { type: Schema.Types.Mixed, default: {} },
    source: { type: String, enum: Object.values(AdmissionRequestSource), required: true },
    status: { type: String, enum: Object.values(TransferRequestStatus), default: TransferRequestStatus.REQUESTED, index: true },
    requestedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    matchedAt: Date,
    acceptedAt: Date,
    completedAt: Date,
    reason: { type: String, trim: true },
    notes: { type: String, trim: true },
}, { timestamps: true });
const OccupancyForecastSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    wardId: { type: Schema.Types.ObjectId, ref: 'Ward', required: true, index: true },
    forecastDate: { type: Date, required: true, index: true },
    horizonDays: { type: Number, required: true, min: 1 },
    projectedOccupied: { type: Number, required: true, min: 0 },
    projectedAvailable: { type: Number, required: true, min: 0 },
    projectedOccupancyRate: { type: Number, required: true, min: 0, max: 1 },
    expectedAdmissions: { type: Number, required: true, min: 0 },
    expectedDischarges: { type: Number, required: true, min: 0 },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    methodology: { type: String, required: true },
    generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });
OccupancyForecastSchema.index({ hospitalId: 1, wardId: 1, forecastDate: 1, horizonDays: 1 }, { unique: true });
export const WardModel = mongoose.models.Ward || model('Ward', WardSchema);
export const BedModel = mongoose.models.Bed || model('Bed', BedSchema);
export const BedAssignmentModel = mongoose.models.BedAssignment || model('BedAssignment', BedAssignmentSchema);
export const BedStatusEventModel = mongoose.models.BedStatusEvent || model('BedStatusEvent', BedStatusEventSchema);
export const TransferRequestModel = mongoose.models.TransferRequest || model('TransferRequest', TransferRequestSchema);
export const OccupancyForecastModel = mongoose.models.OccupancyForecast || model('OccupancyForecast', OccupancyForecastSchema);
