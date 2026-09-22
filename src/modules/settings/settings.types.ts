import { Types } from 'mongoose';

export interface IHMOSecuritySettings {
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  requireStrongPasswords: boolean;
}

export interface IHMONotificationSettings {
  emailNotifications: boolean;
  claimNotifications: boolean;
  preAuthorizationNotifications: boolean;
  systemNotifications: boolean;
}

export interface IHMOClaimsSettings {
  autoAcknowledgeClaims: boolean;
  requireDiagnosisCode: boolean;
  requireProviderReference: boolean;
  allowPartialApproval: boolean;
}

export interface IHMOPreAuthorizationSettings {
  enabled: boolean;
  defaultValidityDays: number;
  requireClinicalNotes: boolean;
  autoExpire: boolean;
}

export interface IHMOBrandingSettings {
  organizationName: string;
  shortName?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  supportEmail?: string;
  supportPhone?: string;
}

export interface IHMOAddressSettings {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country: string;
  postalCode?: string;
}

export interface ISettingsDocument {
  _id: Types.ObjectId;
  hmoId: Types.ObjectId;

  branding: IHMOBrandingSettings;

  address: IHMOAddressSettings;

  currency: string;
  timezone: string;
  dateFormat: string;

  claims: IHMOClaimsSettings;

  preAuthorization: IHMOPreAuthorizationSettings;

  notifications: IHMONotificationSettings;

  security: IHMOSecuritySettings;

  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateHMOSettingsInput {
  branding?: Partial<IHMOBrandingSettings>;
  address?: Partial<IHMOAddressSettings>;

  currency?: string;
  timezone?: string;
  dateFormat?: string;

  claims?: Partial<IHMOClaimsSettings>;

  preAuthorization?: Partial<IHMOPreAuthorizationSettings>;

  notifications?: Partial<IHMONotificationSettings>;

  security?: Partial<IHMOSecuritySettings>;
}

export interface HMOSettingsResponse {
  settings: ISettingsDocument;
}