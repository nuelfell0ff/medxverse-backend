import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis.js';

// Extend Express Request interface if custom user property exists
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
}

export const cache = (durationInSeconds: number = 300) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (req.method !== 'GET') {
      return next();
    }

    const userId = req.user?.id || 'public';
    const key = `cache:${userId}:${req.originalUrl || req.url}`;

    try {
      const cachedData = await redisClient.get(key);

      if (cachedData) {
        res.status(200).json(JSON.parse(cachedData));
        return;
      }

      // Preserve original res.json behavior with explicit payload capture
      const originalJson = res.json.bind(res);
      res.json = (body: any): Response => {
        if (res.statusCode === 200) {
          redisClient.set(key, JSON.stringify(body), 'EX', durationInSeconds);
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.error('Cache Middleware Error:', err);
      next(); // Fail open if Redis drops
    }
  };
};