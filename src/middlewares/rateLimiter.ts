import rateLimit from 'express-rate-limit';

import { RedisStore } from 'rate-limit-redis';

import { redisClient } from '../config/redis.js';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes

  limit: 100, // Limit each IP to 100 requests per windowMs

  standardHeaders: true,

  legacyHeaders: false,

  store: new RedisStore({
    sendCommand: (...args: string[]) =>
      redisClient.call(args[0], ...args.slice(1)) as Promise<any>,
  }),

  message: {
    status: 429,
    error: 'Too many requests, please try again later.',
  },
});