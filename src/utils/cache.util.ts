import { redisClient } from '../config/redis.js';

/**
 * Delete all Redis keys matching a specific pattern.
 * Example: clearCachePattern('cache:*:*patients*')
 *
 * Cache invalidation is a no-op when Redis is not configured.
 */
export const clearCachePattern = async (pattern: string): Promise<void> => {
  const client = redisClient;

  if (!client) {
    return;
  }

  try {
    const stream = client.scanStream({
      match: pattern,
      count: 100,
    });

    stream.on('data', (keys: string[]) => {
      if (keys.length > 0) {
        const pipeline = client.pipeline();
        keys.forEach((key) => pipeline.del(key));
        void pipeline.exec().catch((err: unknown) => {
          console.error('Error invalidating Redis cache keys:', err);
        });
      }
    });

    stream.on('error', (err: Error) => {
      console.error('Error scanning Redis cache keys:', err);
    });
  } catch (err) {
    console.error('Error invalidating Redis cache keys:', err);
  }
};
