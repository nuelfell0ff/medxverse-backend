import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { StaffUserStatus } from './staff-auth.types.js';
export var StaffPresenceStatus;
(function (StaffPresenceStatus) {
    StaffPresenceStatus["ONLINE"] = "ONLINE";
    StaffPresenceStatus["OFFLINE"] = "OFFLINE";
    StaffPresenceStatus["BUSY"] = "BUSY";
    StaffPresenceStatus["AWAY"] = "AWAY";
})(StaffPresenceStatus || (StaffPresenceStatus = {}));
const StaffUserSchema = new Schema({
    hospitalId: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
        index: true,
    },
    staffId: {
        type: Schema.Types.ObjectId,
        ref: 'Staff',
        required: true,
        unique: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
        select: false,
    },
    role: {
        type: String,
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: Object.values(StaffUserStatus),
        default: StaffUserStatus.ACTIVE,
        index: true,
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    lastLoginAt: Date,
    presenceStatus: { type: String, enum: Object.values(StaffPresenceStatus), default: StaffPresenceStatus.OFFLINE, index: true },
    lastSeenAt: Date,
}, { timestamps: true });
StaffUserSchema.index({ hospitalId: 1, email: 1 }, { unique: true });
StaffUserSchema.pre('save', async function () {
    if (!this.isModified('password'))
        return;
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
});
StaffUserSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password)
        return false;
    return bcrypt.compare(candidatePassword, this.password);
};
export const StaffUser = mongoose.models.StaffUser ||
    mongoose.model('StaffUser', StaffUserSchema);
