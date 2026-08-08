import mongoose, { Schema } from 'mongoose';
import { StaffRole } from './staff.types.js';
const StaffSchema = new Schema({
    hospitalId: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
        required: [true, 'Hospital account ID is required'],
        index: true,
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
    },
    role: {
        type: String,
        enum: Object.values(StaffRole),
        required: [true, 'Staff role is required'],
        index: true,
    },
    department: {
        type: String,
        trim: true,
    },
    licenseNumber: {
        type: String,
        trim: true,
    },
    phone: {
        type: String,
        trim: true,
    },
    email: {
        type: String,
        lowercase: true,
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
}, {
    timestamps: true,
});
// Compound index to quickly fetch staff by hospital and role
StaffSchema.index({ hospitalId: 1, role: 1 });
export const Staff = mongoose.models.Staff ||
    mongoose.model('Staff', StaffSchema);
