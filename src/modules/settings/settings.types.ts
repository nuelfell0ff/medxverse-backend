import { Document, Types } from 'mongoose';

export enum ThemeMode {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
  SYSTEM = 'SYSTEM',
}

export enum IntegrationType {
  LAB_EQUIPMENT = 'LAB_EQUIPMENT',
  PACS_IMAGING = 'PACS_IMAGING',
  PAYMENT_GATEWAY = 'PAYMENT_GATEWAY',
  SMS_GATEWAY = 'SMS_GATEWAY',
  EMAIL_SERVICE = 'EMAIL_SERVICE',
  INSURANCE_API = 'INSURANCE_API',
}

export enum IntegrationStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ERROR = 'ERROR',
}

export interface IHospitalBranding {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

export interface IHospitalProfile {
  name: string;
  tagline?: string;
  taxId?: string;
  registrationNumber?: string;
  email: string;
  phone: string;
  website?: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
  };
}

export interface IHospitalSettings {
  hospitalId: Types.ObjectId;
  profile: IHospitalProfile;
  branding: IHospitalBranding;
  defaultLanguage: string;
  timeZone: string;
  currency: string;
  theme: ThemeMode;
  updatedById: Types.ObjectId;
}

export interface IHospitalSettingsDocument extends IHospitalSettings, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IClinicalTemplate {
  hospitalId: Types.ObjectId;
  title: string;
  category: string; // e.g., 'SOAP_NOTE', 'DISCHARGE_SUMMARY', 'PRESCRIPTION'
  departmentId?: Types.ObjectId;
  content: string; // Markdown or JSON representation of form fields
  createdById: Types.ObjectId;
  isActive: boolean;
}

export interface IClinicalTemplateDocument extends IClinicalTemplate, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface ISystemIntegration {
  hospitalId: Types.ObjectId;
  name: string;
  type: IntegrationType;
  status: IntegrationStatus;
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  configOptions?: Record<string, unknown>;
  lastSyncedAt?: Date;
}

export interface ISystemIntegrationDocument extends ISystemIntegration, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertHospitalSettingsInput {
  hospitalId: string;
  profile: IHospitalProfile;
  branding?: IHospitalBranding;
  defaultLanguage?: string;
  timeZone?: string;
  currency?: string;
  theme?: ThemeMode;
  updatedById: string;
}

export interface CreateClinicalTemplateInput {
  hospitalId: string;
  title: string;
  category: string;
  departmentId?: string;
  content: string;
  createdById: string;
}

export interface CreateIntegrationInput {
  hospitalId: string;
  name: string;
  type: IntegrationType;
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  configOptions?: Record<string, unknown>;
}