import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../modules/auth/user.model.js';
import { UserRole } from '../modules/auth/user.types.js';
import { OrganizationType } from '../modules/organization/organization.types.js';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Unauthorized: Access token missing');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;

    const user = await User.findById(decoded.id).populate('organizationId');
    if (!user || !user.isActive) {
      throw new ApiError(401, 'User account is deactivated or invalid');
    }

    req.user = user;
    next();
  } catch (error) {
    next(new ApiError(401, 'Invalid or expired token'));
  }
};

// Guard by Organization Type (HOSPITAL vs HMO)
export const authorizeOrgType = (...allowedOrgTypes: OrganizationType[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedOrgTypes.includes(req.user.orgType)) {
      return next(new ApiError(403, 'Forbidden: Invalid Organization Workspace access'));
    }
    next();
  };
};

// Guard by Roles
export const authorizeRoles = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Forbidden: Insufficient role permissions'));
    }
    next();
  };
};