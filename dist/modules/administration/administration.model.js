import { Schema, model } from 'mongoose';
import { AuditAction, } from './administration.types.js';
const BranchSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    address: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });
BranchSchema.index({ hospitalId: 1, code: 1 }, { unique: true });
export const BranchModel = model('Branch', BranchSchema);
const RoleSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    permissions: [{ type: String, trim: true }],
    isSystemDefault: { type: Boolean, default: false },
}, { timestamps: true });
export const RoleModel = model('Role', RoleSchema);
const AuditEventSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, enum: Object.values(AuditAction), required: true, index: true },
    resource: { type: String, required: true, index: true },
    resourceId: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    payload: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: false });
export const AuditEventModel = model('AuditEvent', AuditEventSchema);
const DeviceSessionSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    deviceId: { type: String, required: true, index: true },
    deviceType: { type: String },
    ipAddress: { type: String },
    lastActiveAt: { type: Date, default: Date.now },
    isRevoked: { type: Boolean, default: false, index: true },
}, { timestamps: true });
export const DeviceSessionModel = model('DeviceSession', DeviceSessionSchema);
