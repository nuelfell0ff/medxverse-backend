import { z } from 'zod';
import { UserRole } from './user.types.js';
import { OrganizationType } from '../organization/organization.types.js';

export const registerOrgAndAdminSchema = z.object({
  body: z.object({
    // Organization Info
    orgName: z.string().min(2, 'Organization name is required'),
    orgCode: z.string().min(2, 'Organization code is required'),
    orgType: z.nativeEnum(OrganizationType),
    orgEmail: z.string().email(),
    orgPhone: z.string().min(8),
    orgAddress: z.string().optional(),

    // Admin User Info
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    phone: z.string().min(8),
    role: z.nativeEnum(UserRole),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});