import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../config/redis.js';

const createRedisStore = (prefix: string) => {
  const client = redisClient;

  if (!client) {
    // Returning undefined lets express-rate-limit use its default
    // in-memory store. This keeps the API usable without a Redis service.
    return undefined;
  }

  return new RedisStore({
    prefix,
    sendCommand: async (...args: string[]) => {
      return (await client.call(args[0], ...args.slice(1))) as any;
    },
  });
};

const apiRedisStore = createRedisStore('medxverse:rate-limit:api:');
const authRedisStore = createRedisStore('medxverse:rate-limit:auth:');

// Global API Limiter (100 requests per 15 minutes per IP).
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  ...(apiRedisStore ? { store: apiRedisStore } : {}),
  message: {
    status: 429,
    error: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

// Stricter Auth Limiter (10 login/register attempts per 15 minutes).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  ...(authRedisStore ? { store: authRedisStore } : {}),
  message: {
    status: 429,
    error: 'Too many authentication attempts, please try again later.',
  },
});
