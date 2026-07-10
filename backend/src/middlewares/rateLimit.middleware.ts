import rateLimit from 'express-rate-limit';
import { config } from '@/config';

/**
 * Global rate limiter applied to all API routes. Protects the backend and the
 * (relatively expensive) local LLM from abuse and accidental request storms.
 */
export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers.
  legacyHeaders: false, // Disable the deprecated `X-RateLimit-*` headers.
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

/**
 * Stricter limiter for authentication endpoints to slow down brute-force
 * attempts against login/register.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
});
