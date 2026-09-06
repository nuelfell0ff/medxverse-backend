import { redisClient } from '../config/redis.js';

/**
 * Delete all Redis keys matching a specific pattern.
 * Example: clearCachePattern('cache:*:*patients*')
 */
export const clearCachePattern = async (pattern: string): Promise<void> => {
  try {
    const stream = redisClient.scanStream({
      match: pattern,
      count: 100,
    });

    stream.on('data', async (keys: string[]) => {
      if (keys.length > 0) {
        const pipeline = redisClient.pipeline();
        keys.forEach((key) => pipeline.del(key));
        await pipeline.exec();
      }
    });
  } catch (err) {
    console.error('Error invalidating Redis cache keys:', err);
  }
};