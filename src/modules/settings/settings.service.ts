import { Types } from 'mongoose';

import { HMOSettingsModel } from './settings.model.js';

import {
  ISettingsDocument,
  UpdateHMOSettingsInput,
} from './settings.types.js';

const DEFAULT_SETTINGS = {
  branding: {
    organizationName: 'HMO',
    shortName: undefined,
    logoUrl: undefined,
    primaryColor: undefined,
    secondaryColor: undefined,
    supportEmail: undefined,
    supportPhone: undefined,
  },

  address: {
    addressLine1: undefined,
    addressLine2: undefined,
    city: undefined,
    state: undefined,
    country: 'Nigeria',
    postalCode: undefined,
  },

  currency: 'NGN',
  timezone: 'Africa/Lagos',
  dateFormat: 'DD/MM/YYYY',

  claims: {
    autoAcknowledgeClaims: false,
    requireDiagnosisCode: true,
    requireProviderReference: true,
    allowPartialApproval: true,
  },

  preAuthorization: {
    enabled: true,
    defaultValidityDays: 30,
    requireClinicalNotes: true,
    autoExpire: true,
  },

  notifications: {
    emailNotifications: true,
    claimNotifications: true,
    preAuthorizationNotifications: true,
    systemNotifications: true,
  },

  security: {
    sessionTimeoutMinutes: 60,
    maxLoginAttempts: 5,
    requireStrongPasswords: true,
  },
};

export class HMOSettingsService {
  private objectId(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
      throw new Error('Invalid HMO ID');
    }

    return new Types.ObjectId(value);
  }

  private cleanString(
    value: unknown,
    field: string,
    maxLength: number
  ): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value !== 'string') {
      throw new Error(`${field} must be a string`);
    }

    const result = value.trim();

    if (result.length > maxLength) {
      throw new Error(
        `${field} cannot exceed ${maxLength} characters`
      );
    }

    return result || undefined;
  }

  private validateEmail(
    value: string | undefined
  ): string | undefined {
    if (!value) return undefined;

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(value)) {
      throw new Error('Invalid support email address');
    }

    return value.toLowerCase();
  }

  private validateColor(
    value: string | undefined,
    field: string
  ): string | undefined {
    if (!value) return undefined;

    if (
      !/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)
    ) {
      throw new Error(
        `${field} must be a valid hexadecimal color`
      );
    }

    return value;
  }

  private validateBoolean(
    value: unknown,
    field: string
  ): boolean | undefined {
    if (value === undefined) return undefined;

    if (typeof value !== 'boolean') {
      throw new Error(`${field} must be a boolean`);
    }

    return value;
  }

  private validateNumber(
    value: unknown,
    field: string,
    min: number,
    max: number
  ): number | undefined {
    if (value === undefined) return undefined;

    const numberValue = Number(value);

    if (
      !Number.isFinite(numberValue) ||
      numberValue < min ||
      numberValue > max
    ) {
      throw new Error(
        `${field} must be between ${min} and ${max}`
      );
    }

    return Math.round(numberValue);
  }

  private validateInput(
    input: UpdateHMOSettingsInput
  ): UpdateHMOSettingsInput {
    const result: UpdateHMOSettingsInput = {};

    if (input.branding) {
      result.branding = {};

      if ('organizationName' in input.branding) {
        const value = this.cleanString(
          input.branding.organizationName,
          'organizationName',
          150
        );

        if (!value) {
          throw new Error(
            'Organization name cannot be empty'
          );
        }

        result.branding.organizationName = value;
      }

      if ('shortName' in input.branding) {
        result.branding.shortName =
          this.cleanString(
            input.branding.shortName,
            'shortName',
            80
          );
      }

      if ('logoUrl' in input.branding) {
        result.branding.logoUrl =
          this.cleanString(
            input.branding.logoUrl,
            'logoUrl',
            1000
          );
      }

      if ('primaryColor' in input.branding) {
        result.branding.primaryColor =
          this.validateColor(
            this.cleanString(
              input.branding.primaryColor,
              'primaryColor',
              20
            ),
            'primaryColor'
          );
      }

      if ('secondaryColor' in input.branding) {
        result.branding.secondaryColor =
          this.validateColor(
            this.cleanString(
              input.branding.secondaryColor,
              'secondaryColor',
              20
            ),
            'secondaryColor'
          );
      }

      if ('supportEmail' in input.branding) {
        result.branding.supportEmail =
          this.validateEmail(
            this.cleanString(
              input.branding.supportEmail,
              'supportEmail',
              254
            )
          );
      }

      if ('supportPhone' in input.branding) {
        result.branding.supportPhone =
          this.cleanString(
            input.branding.supportPhone,
            'supportPhone',
            40
          );
      }
    }

    if (input.address) {
      result.address = {};

      const addressFields = [
        'addressLine1',
        'addressLine2',
        'city',
        'state',
        'postalCode',
      ] as const;

      for (const field of addressFields) {
        if (field in input.address) {
          result.address[field] =
            this.cleanString(
              input.address[field],
              field,
              200
            );
        }
      }

      if ('country' in input.address) {
        const country = this.cleanString(
          input.address.country,
          'country',
          100
        );

        if (!country) {
          throw new Error('Country cannot be empty');
        }

        result.address.country = country;
      }
    }

    if ('currency' in input) {
      const currency = this.cleanString(
        input.currency,
        'currency',
        3
      );

      if (!currency || !/^[A-Za-z]{3}$/.test(currency)) {
        throw new Error(
          'Currency must be a valid 3-letter currency code'
        );
      }

      result.currency = currency.toUpperCase();
    }

    if ('timezone' in input) {
      const timezone = this.cleanString(
        input.timezone,
        'timezone',
        100
      );

      if (!timezone) {
        throw new Error('Timezone cannot be empty');
      }

      result.timezone = timezone;
    }

    if ('dateFormat' in input) {
      const dateFormat = this.cleanString(
        input.dateFormat,
        'dateFormat',
        30
      );

      if (!dateFormat) {
        throw new Error('Date format cannot be empty');
      }

      result.dateFormat = dateFormat;
    }

    if (input.claims) {
      result.claims = {};

      const booleanFields = [
        'autoAcknowledgeClaims',
        'requireDiagnosisCode',
        'requireProviderReference',
        'allowPartialApproval',
      ] as const;

      for (const field of booleanFields) {
        if (field in input.claims) {
          result.claims[field] =
            this.validateBoolean(
              input.claims[field],
              field
            );
        }
      }
    }

    if (input.preAuthorization) {
      result.preAuthorization = {};

      if ('enabled' in input.preAuthorization) {
        result.preAuthorization.enabled =
          this.validateBoolean(
            input.preAuthorization.enabled,
            'enabled'
          );
      }

      if (
        'defaultValidityDays' in
        input.preAuthorization
      ) {
        result.preAuthorization.defaultValidityDays =
          this.validateNumber(
            input.preAuthorization.defaultValidityDays,
            'defaultValidityDays',
            1,
            365
          );
      }

      if (
        'requireClinicalNotes' in
        input.preAuthorization
      ) {
        result.preAuthorization.requireClinicalNotes =
          this.validateBoolean(
            input.preAuthorization.requireClinicalNotes,
            'requireClinicalNotes'
          );
      }

      if ('autoExpire' in input.preAuthorization) {
        result.preAuthorization.autoExpire =
          this.validateBoolean(
            input.preAuthorization.autoExpire,
            'autoExpire'
          );
      }
    }

    if (input.notifications) {
      result.notifications = {};

      const notificationFields = [
        'emailNotifications',
        'claimNotifications',
        'preAuthorizationNotifications',
        'systemNotifications',
      ] as const;

      for (const field of notificationFields) {
        if (field in input.notifications) {
          result.notifications[field] =
            this.validateBoolean(
              input.notifications[field],
              field
            );
        }
      }
    }

    if (input.security) {
      result.security = {};

      if (
        'sessionTimeoutMinutes' in
        input.security
      ) {
        result.security.sessionTimeoutMinutes =
          this.validateNumber(
            input.security.sessionTimeoutMinutes,
            'sessionTimeoutMinutes',
            5,
            1440
          );
      }

      if ('maxLoginAttempts' in input.security) {
        result.security.maxLoginAttempts =
          this.validateNumber(
            input.security.maxLoginAttempts,
            'maxLoginAttempts',
            3,
            20
          );
      }

      if (
        'requireStrongPasswords' in
        input.security
      ) {
        result.security.requireStrongPasswords =
          this.validateBoolean(
            input.security.requireStrongPasswords,
            'requireStrongPasswords'
          );
      }
    }

    return result;
  }

  public async getSettings(
    hmoId: string
  ): Promise<ISettingsDocument> {
    const hmoObjectId = this.objectId(hmoId);

    let settings = await HMOSettingsModel.findOne({
      hmoId: hmoObjectId,
    }).exec();

    if (!settings) {
      settings = await HMOSettingsModel.create({
        hmoId: hmoObjectId,
        ...DEFAULT_SETTINGS,
      });
    }

    return settings;
  }

  public async updateSettings(
    hmoId: string,
    input: UpdateHMOSettingsInput
  ): Promise<ISettingsDocument> {
    const hmoObjectId = this.objectId(hmoId);

    const validated = this.validateInput(input);

    const settings = await HMOSettingsModel.findOne({
      hmoId: hmoObjectId,
    }).exec();

    if (!settings) {
      const created = await HMOSettingsModel.create({
        hmoId: hmoObjectId,
        ...DEFAULT_SETTINGS,
        ...validated,

        branding: {
          ...DEFAULT_SETTINGS.branding,
          ...validated.branding,
        },

        address: {
          ...DEFAULT_SETTINGS.address,
          ...validated.address,
        },

        claims: {
          ...DEFAULT_SETTINGS.claims,
          ...validated.claims,
        },

        preAuthorization: {
          ...DEFAULT_SETTINGS.preAuthorization,
          ...validated.preAuthorization,
        },

        notifications: {
          ...DEFAULT_SETTINGS.notifications,
          ...validated.notifications,
        },

        security: {
          ...DEFAULT_SETTINGS.security,
          ...validated.security,
        },
      });

      return created;
    }

    if (validated.branding) {
      Object.assign(
        settings.branding,
        validated.branding
      );
    }

    if (validated.address) {
      Object.assign(
        settings.address,
        validated.address
      );
    }

    if (validated.claims) {
      Object.assign(
        settings.claims,
        validated.claims
      );
    }

    if (validated.preAuthorization) {
      Object.assign(
        settings.preAuthorization,
        validated.preAuthorization
      );
    }

    if (validated.notifications) {
      Object.assign(
        settings.notifications,
        validated.notifications
      );
    }

    if (validated.security) {
      Object.assign(
        settings.security,
        validated.security
      );
    }

    if (validated.currency !== undefined) {
      settings.currency = validated.currency;
    }

    if (validated.timezone !== undefined) {
      settings.timezone = validated.timezone;
    }

    if (validated.dateFormat !== undefined) {
      settings.dateFormat = validated.dateFormat;
    }

    return settings.save();
  }

  public async resetSettings(
    hmoId: string
  ): Promise<ISettingsDocument> {
    const hmoObjectId = this.objectId(hmoId);

    return HMOSettingsModel.findOneAndUpdate(
      { hmoId: hmoObjectId },
      {
        $set: DEFAULT_SETTINGS,
        $setOnInsert: {
          hmoId: hmoObjectId,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    ).exec();
  }
}

export const hmoSettingsService =
  new HMOSettingsService();