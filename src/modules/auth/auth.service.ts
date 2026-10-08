import jwt, { SignOptions } from 'jsonwebtoken';
import { Types } from 'mongoose';
import { Account } from './auth.model.js';
import {
  RegisterAccountDTO,
  LoginDTO,
  AuthResponse,
  IAccountDocument,
  UpdateAccountProfileDTO,
  ChangeAccountPasswordDTO,
} from './auth.types.js';

function passwordIsStrongEnough(password: string): boolean {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(
    password
  );
}

export class AuthService {
  private static generateToken(account: IAccountDocument): string {
    const secret = process.env.JWT_SECRET || 'fallback_secret_key';
    const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

    return jwt.sign(
      {
        accountId: account._id.toString(),
        id: account._id.toString(),
        userType: 'ACCOUNT',
        accountType: account.accountType,
        name: account.name,
        email: account.email,
        ...(account.accountType === 'HMO'
          ? { hmoId: account._id.toString() }
          : { hospitalId: account._id.toString() }),
      },
      secret,
      { expiresIn }
    );
  }

  private static formatAccountPayload(account: IAccountDocument) {
    return {
      id: account._id.toString(),
      name: account.name,
      email: account.email,
      accountType: account.accountType,
      code: account.code,
      phone: account.phone,
      address: account.address,
      logoUrl: account.logoUrl,
      isActive: account.isActive,
    };
  }

  public static async register(dto: RegisterAccountDTO): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();

    const existingAccount = await Account.findOne({ email });
    if (existingAccount) {
      throw new Error('An account with this email already exists');
    }

    if (dto.code) {
      const existingCode = await Account.findOne({
        code: dto.code.trim().toUpperCase(),
      });

      if (existingCode) {
        throw new Error('Account code is already taken');
      }
    }

    const newAccount = await Account.create({
      ...dto,
      email,
      name: dto.name.trim(),
      phone: dto.phone.trim(),
      address: dto.address?.trim(),
      code: dto.code ? dto.code.trim().toUpperCase() : undefined,
    });

    const token = this.generateToken(newAccount);

    return {
      token,
      account: this.formatAccountPayload(newAccount),
    };
  }

  public static async login(dto: LoginDTO): Promise<AuthResponse> {
    const account = await Account.findOne({
      email: dto.email.trim().toLowerCase(),
    }).select('+password');

    if (!account) {
      throw new Error('Invalid email or password');
    }

    if (!account.isActive) {
      throw new Error(
        'This account has been deactivated. Please contact support.'
      );
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

  public static async getProfile(accountId: string) {
    if (!Types.ObjectId.isValid(accountId)) {
      throw new Error('Invalid account ID');
    }

    const account = await Account.findById(accountId);

    if (!account) {
      throw new Error('Account not found');
    }

    return this.formatAccountPayload(account);
  }

  public static async updateProfile(
    accountId: string,
    dto: UpdateAccountProfileDTO
  ) {
    if (!Types.ObjectId.isValid(accountId)) {
      throw new Error('Invalid account ID');
    }

    const account = await Account.findById(accountId);

    if (!account) {
      throw new Error('Account not found');
    }

    if (!account.isActive) {
      throw new Error(
        'This account has been deactivated. Please contact support.'
      );
    }

    if (dto.name !== undefined) {
      const name = String(dto.name).trim();

      if (!name) {
        throw new Error('Account name is required');
      }

      account.name = name;
    }

    if (dto.email !== undefined) {
      const email = String(dto.email).trim().toLowerCase();

      if (!email) {
        throw new Error('Email is required');
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Please provide a valid email address');
      }

      const existingAccount = await Account.findOne({
        email,
        _id: { $ne: account._id },
      });

      if (existingAccount) {
        throw new Error('An account with this email already exists');
      }

      account.email = email;
    }

    if (dto.phone !== undefined) {
      const phone = String(dto.phone).trim();

      if (!phone) {
        throw new Error('Phone number is required');
      }

      account.phone = phone;
    }

    if (dto.address !== undefined) {
      account.address = String(dto.address).trim() || undefined;
    }

    if (dto.logoUrl !== undefined) {
      account.logoUrl = String(dto.logoUrl).trim() || undefined;
    }

    await account.save();

    return this.formatAccountPayload(account);
  }

  public static async changePassword(
    accountId: string,
    dto: ChangeAccountPasswordDTO
  ) {
    if (!Types.ObjectId.isValid(accountId)) {
      throw new Error('Invalid account ID');
    }

    const currentPassword = String(dto.currentPassword || '');
    const newPassword = String(dto.newPassword || '');

    if (!currentPassword || !newPassword) {
      throw new Error(
        'Current password and new password are required'
      );
    }

    if (
      dto.confirmPassword !== undefined &&
      newPassword !== String(dto.confirmPassword)
    ) {
      throw new Error('New password and confirmation do not match');
    }

    if (currentPassword === newPassword) {
      throw new Error(
        'New password must be different from the current password'
      );
    }

    if (!passwordIsStrongEnough(newPassword)) {
      throw new Error(
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character'
      );
    }

    const account = await Account.findById(accountId).select('+password');

    if (!account) {
      throw new Error('Account not found');
    }

    if (!account.isActive) {
      throw new Error(
        'This account has been deactivated. Please contact support.'
      );
    }

    const isMatch = await account.comparePassword(currentPassword);

    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }

    account.password = newPassword;
    await account.save();

    return {
      changedAt: new Date().toISOString(),
    };
  }
}
