import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type AccountType = 'HOSPITAL' | 'HMO' | 'PATIENT_PORTAL';

type UserType = 'ACCOUNT' | 'STAFF' | 'PATIENT';

export interface AuthRequest extends Request {
  account?: {
    accountId: string;
    accountType: AccountType;
    name: string;
    email: string;
    role?: string;
    userType?: UserType;
    [key: string]: unknown;
  };

  user?: {
    _id: string;
    hospitalId?: string;
    hmoId?: string;
    accountId?: string;
    accountType?: AccountType;
    name?: string;
    email?: string;
    role?: string;
    userType?: UserType;
    [key: string]: unknown;
  };
}

interface JwtPayload {
  _id?: string;
  id?: string;
  accountId?: string;
  patientId?: string;
  portalAccountId?: string;
  hospitalId?: string;
  hmoId?: string;
  hospital?: string;
  hmo?: string;
  accountType?: AccountType | string;
  name?: string;
  email?: string;
  role?: string;
  userType?: UserType;
  [key: string]: unknown;
}

/**
 * Safely converts an unknown JWT value into a string.
 * Non-string values are ignored instead of causing TypeScript errors.
 */
const optionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

/**
 * Authenticate a request using a JWT.
 */
export const authenticateAccount = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
    return;
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback_secret_key'
    ) as JwtPayload;

    const requestPath = req.originalUrl.split('?')[0];

    // Patient portal tokens must not be used as hospital or HMO accounts.
    // Permit patient portal routes for account linking and telemedicine.
    if (
      decoded.userType === 'PATIENT' &&
      !requestPath.includes('/telemedicine') &&
      !requestPath.includes('/patient-portal')
    ) {
      res.status(403).json({
        success: false,
        message:
          'Patient portal tokens may only access patient portal and telemedicine endpoints.',
      });
      return;
    }

    const rawAccountType = decoded.accountType;

    const accountType: AccountType | undefined =
      rawAccountType === 'HOSPITAL' ||
      rawAccountType === 'HMO' ||
      rawAccountType === 'PATIENT_PORTAL'
        ? rawAccountType
        : undefined;

    // Resolve the account ID independently from the clinical patient ID.
    const accountId =
      optionalString(decoded.accountId) ??
      optionalString(decoded._id) ??
      optionalString(decoded.id) ??
      optionalString(decoded.portalAccountId);

    const userId =
      decoded.userType === 'PATIENT'
        ? optionalString(decoded.patientId) ??
          optionalString(decoded._id) ??
          optionalString(decoded.id) ??
          optionalString(decoded.portalAccountId) ??
          optionalString(decoded.accountId)
        : optionalString(decoded._id) ??
          optionalString(decoded.id) ??
          optionalString(decoded.accountId);

    if (!accountId) {
      res.status(401).json({
        success: false,
        message: 'Invalid authentication token: account ID is missing.',
      });
      return;
    }

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Invalid authentication token: user ID is missing.',
      });
      return;
    }

    // Resolve hospital and HMO tenant IDs as strings only.
    const resolvedHmoId =
      optionalString(decoded.hmoId) ??
      optionalString(decoded.hmo) ??
      (accountType === 'HMO' ? accountId : undefined);

    const resolvedHospitalId =
      optionalString(decoded.hospitalId) ??
      optionalString(decoded.hospital) ??
      (accountType === 'HOSPITAL' ? accountId : undefined);

    // Preserve the decoded token data for existing middleware and routes.
    req.account = {
      ...decoded,
      accountId,
      accountType: accountType as AccountType,
      name: optionalString(decoded.name) ?? '',
      email: optionalString(decoded.email) ?? '',
      role: optionalString(decoded.role),
      userType: decoded.userType ?? 'ACCOUNT',
    };

    // Normalize the user object for downstream controllers.
    req.user = {
      ...decoded,
      _id: userId,
      accountId,
      accountType,
      hospitalId: resolvedHospitalId,
      hmoId: resolvedHmoId,
      name: optionalString(decoded.name),
      email: optionalString(decoded.email),
      role: optionalString(decoded.role),
      userType: decoded.userType ?? 'ACCOUNT',
    };

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

/**
 * Restrict access based on account type or user role.
 *
 * Examples:
 * restrictTo('HMO')
 * restrictTo('HOSPITAL')
 * restrictTo('ADMIN')
 */
export const restrictTo = (...allowedRoles: string[]) => {
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (
      req.user?.userType === 'PATIENT' &&
      !allowedRoles.includes('PATIENT')
    ) {
      res.status(403).json({
        success: false,
        message:
          'Patient portal access is limited to patient-enabled features.',
      });
      return;
    }

    const role =
      req.user?.role ??
      req.user?.accountType ??
      req.account?.accountType;

    if (!role || !allowedRoles.includes(role)) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to perform this action.',
      });
      return;
    }

    next();
  };
};

/**
 * Compatibility aliases for existing routes.
 */
export const protect = authenticateAccount;
export const authenticate = authenticateAccount;
export const authorize = restrictTo;