import jwt, { SignOptions } from 'jsonwebtoken';
import { Account } from './auth.model.js';
import {
  RegisterAccountDTO,
  LoginDTO,
  AuthResponse,
  IAccountDocument,
} from './auth.types.js';

export class AuthService {
  private static generateToken(account: IAccountDocument): string {
    const secret = process.env.JWT_SECRET || 'fallback_secret_key';
    const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

    return jwt.sign(
      {
        accountId: account._id.toString(),
        accountType: account.accountType,
        name: account.name,
        email: account.email,
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
    };
  }

  public static async register(dto: RegisterAccountDTO): Promise<AuthResponse> {
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

  public static async login(dto: LoginDTO): Promise<AuthResponse> {
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

  public static async getProfile(accountId: string) {
    const account = await Account.findById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    return this.formatAccountPayload(account);
  }
}