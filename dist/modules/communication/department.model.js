import mongoose, { Schema } from 'mongoose';
const DepartmentSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'StaffUser' },
}, { timestamps: true });
DepartmentSchema.index({ hospitalId: 1, code: 1 }, { unique: true });
DepartmentSchema.index({ hospitalId: 1, name: 1 }, { unique: true });
export const Department = mongoose.models.Department ||
    mongoose.model('Department', DepartmentSchema);
