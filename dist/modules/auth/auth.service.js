import jwt from 'jsonwebtoken';
import { Account } from './auth.model.js';
export class AuthService {
    static generateToken(account) {
        const secret = process.env.JWT_SECRET || 'fallback_secret_key';
        const expiresIn = (process.env.JWT_EXPIRES_IN || '7d');
        return jwt.sign({
            accountId: account._id.toString(),
            accountType: account.accountType,
            name: account.name,
            email: account.email,
        }, secret, { expiresIn });
    }
    static formatAccountPayload(account) {
        return {
            id: account._id.toString(),
            name: account.name,
            email: account.email,
            accountType: account.accountType,
            code: account.code,
            phone: account.phone,
            address: account.address,
            logoUrl: account.logoUrl,
        };
    }
    static async register(dto) {
        const existingAccount = await Account.findOne({ email: dto.email.toLowerCase() });
        if (existingAccount) {
            throw new Error('An account with this email already exists');
        }
        if (dto.code) {
            const existingCode = await Account.findOne({ code: dto.code.toUpperCase() });
            if (existingCode) {
                throw new Error('Account code is already taken');
            }
        }
        const newAccount = await Account.create({
            ...dto,
            email: dto.email.toLowerCase(),
            code: dto.code ? dto.code.toUpperCase() : undefined,
        });
        const token = this.generateToken(newAccount);
        return {
            token,
            account: this.formatAccountPayload(newAccount),
        };
    }
    static async login(dto) {
        const account = await Account.findOne({ email: dto.email.toLowerCase() }).select('+password');
        if (!account) {
            throw new Error('Invalid email or password');
        }
        if (!account.isActive) {
            throw new Error('This account has been deactivated. Please contact support.');
        }
        const isMatch = await account.comparePassword(dto.password);
        if (!isMatch) {
            throw new Error('Invalid email or password');
        }
        const token = this.generateToken(account);
        return {
            token,
            account: this.formatAccountPayload(account),
        };
    }
    static async getProfile(accountId) {
        const account = await Account.findById(accountId);
        if (!account) {
            throw new Error('Account not found');
        }
        return this.formatAccountPayload(account);
    }
}
