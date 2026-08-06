import jwt from 'jsonwebtoken';
import { User } from '../user/user.model.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import { AuthUserPayload } from '../../middlewares/auth.middleware.js';
import { LoginDto, LoginResponse, AuthTokens } from './auth.types.js';

export class AuthService {
  /**
   * Generates Access and Refresh JWT Tokens
   */
  private static generateTokens(payload: AuthUserPayload): AuthTokens {
    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });

    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Authenticates user credential and returns user session with tokens
   */
  static async login(dto: LoginDto): Promise<LoginResponse> {
    const { email, password } = dto;

    if (!email || !password) {
      throw new ApiError(400, 'Please provide email and password.');
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      throw new ApiError(401, 'Invalid email or password credentials.');
    }

    if (!user.isActive) {
      throw new ApiError(403, 'Your account is currently deactivated. Contact organization admin.');
    }

    const tokenPayload: AuthUserPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      organizationId: user.organizationId.toString(),
    };

    const tokens = this.generateTokens(tokenPayload);

    return {
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId.toString(),
        staffCode: user.staffCode,
        isActive: user.isActive,
      },
      tokens,
    };
  }

  /**
   * Issues a new Access Token using a valid Refresh Token
   */
  static async refreshSession(refreshToken: string): Promise<{ accessToken: string }> {
    if (!refreshToken) {
      throw new ApiError(400, 'Refresh token is required.');
    }

    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as AuthUserPayload;

      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        throw new ApiError(401, 'User no longer exists or is deactivated.');
      }

      const newAccessToken = jwt.sign(
        {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          organizationId: user.organizationId.toString(),
        },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN as any }
      );

      return { accessToken: newAccessToken };
    } catch (error) {
      throw new ApiError(401, 'Invalid or expired refresh token.');
    }
  }

  /**
   * Retrieves profile details for currently authenticated user
   */
  static async getCurrentUser(userId: string): Promise<any> {
    const user = await User.findById(userId).populate('organizationId', 'name type code logoUrl');
    if (!user) {
      throw new ApiError(404, 'User profile not found.');
    }
    return user;
  }
}