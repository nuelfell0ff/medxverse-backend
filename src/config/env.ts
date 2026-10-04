import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  MONGO_URI: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  CORS_ORIGIN: string;
  APP_BASE_URL: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  INVITATION_EXPIRES_HOURS: number;
}

const getEnv = (): EnvConfig => {
  const requiredEnvs: (keyof EnvConfig)[] = [
    'MONGO_URI',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  for (const key of requiredEnvs) {
    if (!process.env[key]) {
      throw new Error(`[Config Error] Missing mandatory environment variable: ${key}`);
    }
  }

  return {
    NODE_ENV: (process.env.NODE_ENV as EnvConfig['NODE_ENV']) || 'development',
    PORT: parseInt(process.env.PORT || '5000', 10),
    MONGO_URI: process.env.MONGO_URI!,
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    APP_BASE_URL: process.env.APP_BASE_URL || 'http://localhost:3000',
    RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
    EMAIL_FROM: process.env.EMAIL_FROM || undefined,
    INVITATION_EXPIRES_HOURS: Math.max(1, parseInt(process.env.INVITATION_EXPIRES_HOURS || '72', 10)),
  };
};

export const env = getEnv();