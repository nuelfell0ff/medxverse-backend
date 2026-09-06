import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../config/redis.js';

// Global API Limiter (100 requests per 15 minutes per IP)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: async (...args: string[]) => {
      return (await redisClient.call(args[0], ...args.slice(1))) as any;
    },
  }),
  message: {
    status: 429,
    error: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

// Stricter Auth Limiter (10 login/register attempts per 15 minutes)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: async (...args: string[]) => {
      return (await redisClient.call(args[0], ...args.slice(1))) as any;
    },
  }),
  message: {
    status: 429,
    error: 'Too many authentication attempts, please try again later.',
  },
});