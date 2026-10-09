import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
}

/**
 * Cache middleware for GET routes.
 * @param durationInSeconds Time-to-live (TTL) for cache in seconds.
 *
 * Redis is optional: if it has not been configured, the request continues
 * without caching instead of failing.
 */
export const cacheMiddleware = (durationInSeconds: number = 300) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (req.method !== 'GET' || !redisClient) {
      next();
      return;
    }

    const userId = req.user?.id || 'public';
    const key = `cache:${userId}:${req.originalUrl || req.url}`;

    try {
      const cachedData = await redisClient.get(key);

      if (cachedData) {
        res.status(200).json(JSON.parse(cachedData));
        return;
      }

      const originalJson = res.json.bind(res);
      res.json = (body: any): Response => {
        if (res.statusCode === 200) {
          // Do not delay or fail the HTTP response if writing to Redis fails.
          void redisClient
            ?.set(key, JSON.stringify(body), 'EX', durationInSeconds)
            .catch((err: unknown) => {
              console.error('Cache write error:', err);
            });
        }

        return originalJson(body);
      };

      next();
    } catch (err) {
      console.error('Cache Middleware Error:', err);
      next(); // Fail open: proceed if Redis encounters an issue.
    }
  };
};
