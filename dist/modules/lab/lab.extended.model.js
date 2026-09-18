import mongoose, { Schema, model } from 'mongoose';
import { SpecimenStatus, CriticalAlertStatus, AnalyzerProtocol, ResultFlag, EntryMethod } from './lab.types.js';
const ChainOfCustodySchema = new Schema({
    timestamp: { type: Date, default: Date.now },
    action: { type: String, required: true, trim: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    location: { type: String, trim: true },
    notes: { type: String, trim: true },
}, { _id: false });
const SpecimenSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'LabOrder', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    barcode: { type: String, required: true, unique: true, index: true, trim: true },
    specimenType: { type: String, required: true, trim: true },
    status: { type: String, enum: Object.values(SpecimenStatus), required: true, default: SpecimenStatus.COLLECTED, index: true },
    collectedAt: Date,
    collectedBy: { type: Schema.Types.ObjectId, ref: 'Account' },
    inTransitAt: Date,
    receivedAt: Date,
    receivedBy: { type: Schema.Types.ObjectId, ref: 'Account' },
    processedAt: Date,
    processedBy: { type: Schema.Types.ObjectId, ref: 'Account' },
    rejectionReason: { type: String, trim: true },
    chainOfCustody: { type: [ChainOfCustodySchema], default: [] },
}, { timestamps: true });
SpecimenSchema.index({ hospitalId: 1, orderId: 1 });
SpecimenSchema.index({ hospitalId: 1, status: 1, updatedAt: -1 });
const TestResultSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'LabOrder', required: true, index: true },
    specimenId: { type: Schema.Types.ObjectId, ref: 'Specimen', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    parameterName: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    numericValue: Number,
    unit: { type: String, trim: true },
    referenceRange: { type: String, trim: true },
    lowerReference: Number,
    upperReference: Number,
    criticalLow: Number,
    criticalHigh: Number,
    flag: { type: String, enum: Object.values(ResultFlag), default: ResultFlag.NORMAL },
    previousValue: { type: String, trim: true },
    deltaPercentage: Number,
    entryMethod: { type: String, enum: Object.values(EntryMethod), default: EntryMethod.MANUAL },
    analyzerName: { type: String, trim: true },
    analyzerResultId: { type: String, trim: true },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'Account' },
    verifiedAt: Date,
    authorizedBy: { type: Schema.Types.ObjectId, ref: 'Account' },
    authorizedAt: Date,
    releasedAt: Date,
}, { timestamps: true });
TestResultSchema.index({ hospitalId: 1, orderId: 1, parameterName: 1, createdAt: -1 });
const ReferenceRangeSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    testName: { type: String, trim: true, index: true },
    parameterName: { type: String, required: true, trim: true, index: true },
    unit: { type: String, trim: true },
    minimumAge: Number,
    maximumAge: Number,
    sex: { type: String, enum: ['MALE', 'FEMALE', 'ANY'], default: 'ANY' },
    lowerValue: Number,
    upperValue: Number,
    criticalLow: Number,
    criticalHigh: Number,
    displayRange: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });
ReferenceRangeSchema.index({ hospitalId: 1, parameterName: 1, isActive: 1 });
const CriticalAlertSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'LabOrder', required: true, index: true },
    testResultId: { type: Schema.Types.ObjectId, ref: 'TestResult', index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    clinicianId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    parameterName: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    direction: { type: String, enum: ['CRITICAL_LOW', 'CRITICAL_HIGH'], required: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: Object.values(CriticalAlertStatus), default: CriticalAlertStatus.OPEN, index: true },
    notifiedAt: { type: Date, default: Date.now },
    acknowledgedAt: Date,
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'Account' },
    resolvedAt: Date,
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'Account' },
}, { timestamps: true });
CriticalAlertSchema.index({ hospitalId: 1, clinicianId: 1, status: 1, createdAt: -1 });
const AnalyzerInterfaceSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    name: { type: String, required: true, trim: true },
    protocol: { type: String, enum: Object.values(AnalyzerProtocol), required: true },
    host: { type: String, trim: true },
    port: Number,
    isActive: { type: Boolean, default: true, index: true },
    lastSeenAt: Date,
    lastMessageAt: Date,
}, { timestamps: true });
AnalyzerInterfaceSchema.index({ hospitalId: 1, name: 1 }, { unique: true });
export const SpecimenModel = mongoose.models.Specimen || model('Specimen', SpecimenSchema);
export const TestResultModel = mongoose.models.TestResult || model('TestResult', TestResultSchema);
export const ReferenceRangeModel = mongoose.models.ReferenceRange || model('ReferenceRange', ReferenceRangeSchema);
export const CriticalAlertModel = mongoose.models.CriticalAlert || model('CriticalAlert', CriticalAlertSchema);
export const AnalyzerInterfaceModel = mongoose.models.AnalyzerInterface || model('AnalyzerInterface', AnalyzerInterfaceSchema);
