import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AuthUserPayload } from '../modules/auth/auth.types.js';
import { ApiError } from './ApiError.js';

export class JwtUtils {
  /**
   * Signs a short-lived access token.
   */
  static generateAccessToken(payload: AuthUserPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    });
  }

  /**
   * Signs a long-lived refresh token.
   */
  static generateRefreshToken(payload: AuthUserPayload): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
    });
  }

  /**
   * Verifies an incoming access token.
   */
  static verifyAccessToken(token: string): AuthUserPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as AuthUserPayload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new ApiError(401, 'Access token has expired.');
      }
      throw new ApiError(401, 'Invalid access token.');
    }
  }

  /**
   * Verifies an incoming refresh token.
   */
  static verifyRefreshToken(token: string): AuthUserPayload {
    try {
      return jwt.verify(token, env.JWT_REFRESH_SECRET) as AuthUserPayload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new ApiError(401, 'Refresh token has expired. Please sign in again.');
      }
      throw new ApiError(401, 'Invalid refresh token.');
    }
  }
}