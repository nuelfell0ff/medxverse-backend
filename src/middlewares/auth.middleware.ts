import { Request, Response, NextFunction } from 'express';
import { JwtUtils } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';
import { UserRole } from '../constants/roles.enum.js';
import { AuthUserPayload } from '../modules/auth/auth.types.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

/**
 * Validates JWT Access Token from Authorization Header
 */
export const protect = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new ApiError(401, 'Authentication required. Token missing from authorization header.');
    }

    const decoded = JwtUtils.verifyAccessToken(token);

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      organizationId: decoded.organizationId,
    };

    next();
  } catch (error: any) {
    next(error);
  }
};

/**
 * Restricts access to specified RBAC roles
 */
export const restrictTo = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `Forbidden: Role '${req.user.role}' is not authorized to perform this operation.`
        )
      );
    }

    next();
  };
};