import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const getEnv = () => {
    const requiredEnvs = [
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
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: parseInt(process.env.PORT || '5000', 10),
        MONGO_URI: process.env.MONGO_URI,
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
        JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    };
};
export const env = getEnv();
