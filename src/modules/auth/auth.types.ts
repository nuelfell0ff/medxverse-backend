import { UserRole } from '../../constants/roles.enum.js';

export interface AuthUserPayload {
  id: string;
  email: string;
  role: UserRole;
  organizationId: string;
}

// Alias for compatibility
export type IJwtPayload = AuthUserPayload;

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUserResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  organizationId: string;
  staffCode?: string;
  isActive: boolean;
}

export interface LoginResponse {
  user: AuthUserResponse;
  tokens: AuthTokens;
}