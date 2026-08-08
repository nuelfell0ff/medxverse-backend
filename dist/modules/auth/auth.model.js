import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { AccountType } from './auth.types.js';
const AccountSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Account name is required'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long'],
        select: false,
    },
    accountType: {
        type: String,
        enum: Object.values(AccountType),
        required: [true, 'Account type is required (HOSPITAL or HMO)'],
        index: true,
    },
    code: {
        type: String,
        uppercase: true,
        trim: true,
        unique: true,
        sparse: true,
        index: true,
    },
    phone: {
        type: String,
        required: [true, 'Contact phone number is required'],
        trim: true,
    },
    address: {
        type: String,
        trim: true,
    },
    logoUrl: {
        type: String,
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
AccountSchema.pre('save', async function () {
    if (!this.isModified('password') || !this.password) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});
AccountSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password)
        return false;
    return bcrypt.compare(candidatePassword, this.password);
};
export const Account = mongoose.models.Account ||
    mongoose.model('Account', AccountSchema);
