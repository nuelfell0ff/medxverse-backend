import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from './ApiError.js';
export class JwtUtils {
    /**
     * Signs a short-lived access token.
     */
    static generateAccessToken(payload) {
        return jwt.sign(payload, env.JWT_SECRET, {
            expiresIn: env.JWT_EXPIRES_IN,
        });
    }
    /**
     * Signs a long-lived refresh token.
     */
    static generateRefreshToken(payload) {
        return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
            expiresIn: env.JWT_REFRESH_EXPIRES_IN,
        });
    }
    /**
     * Verifies an incoming access token.
     */
    static verifyAccessToken(token) {
        try {
            return jwt.verify(token, env.JWT_SECRET);
        }
        catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new ApiError(401, 'Access token has expired.');
            }
            throw new ApiError(401, 'Invalid access token.');
        }
    }
    /**
     * Verifies an incoming refresh token.
     */
    static verifyRefreshToken(token) {
        try {
            return jwt.verify(token, env.JWT_REFRESH_SECRET);
        }
        catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new ApiError(401, 'Refresh token has expired. Please sign in again.');
            }
            throw new ApiError(401, 'Invalid refresh token.');
        }
    }
}
