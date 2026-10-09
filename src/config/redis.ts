import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL?.trim();

/**
 * Redis is optional for local development and deployments that have not
 * provisioned a Redis service yet. When REDIS_URL is absent, callers should
 * skip Redis-backed caching and use express-rate-limit's default memory store.
 */
export const redisClient: Redis | null = redisUrl
  ? new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    })
  : null;

if (redisClient) {
  redisClient.on('connect', () => {
    console.log('Redis connected successfully.');
  });

  redisClient.on('error', (err: Error) => {
    console.error('Redis connection error:', err);
  });
} else {
  console.warn(
    'REDIS_URL is not configured. Redis caching is disabled and rate limiting will use in-memory storage.'
  );
}
