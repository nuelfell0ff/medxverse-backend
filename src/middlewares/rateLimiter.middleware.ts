import rateLimit from 'express-rate-limit';

/**
 * Rate limiting must not depend on Redis being reachable.
 *
 * The previous RedisStore caused login/register requests to return HTTP 500
 * when REDIS_URL was missing, unreachable, or exhausted its retry limit.
 * express-rate-limit's built-in MemoryStore keeps the API usable when Redis
 * is unavailable. Limits are per process, so use a healthy shared store later
 * if the deployment needs rate limits shared across multiple instances.
 */

// Global API Limiter (100 requests per 15 minutes per IP)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
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
  message: {
    status: 429,
    error: 'Too many authentication attempts, please try again later.',
  },
});
