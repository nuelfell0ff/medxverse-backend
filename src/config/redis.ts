import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

redisClient.on('connect', () => {
  console.log('Redis connected successfully.');
});

redisClient.on('error', (err: Error) => {
  console.error('Redis connection error:', err);
});