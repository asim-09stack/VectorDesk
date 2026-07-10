import { Router } from 'express';
import * as authController from '@/controllers/auth.controller';
import { validate } from '@/middlewares/validate.middleware';
import { authenticate } from '@/middlewares/auth.middleware';
import { authRateLimiter } from '@/middlewares/rateLimit.middleware';
import { loginSchema, registerSchema } from '@/validators/auth.validator';

const router = Router();

// Public auth endpoints are rate-limited more strictly to deter brute force.
router.post(
  '/register',
  authRateLimiter,
  validate({ body: registerSchema }),
  authController.register,
);

router.post(
  '/login',
  authRateLimiter,
  validate({ body: loginSchema }),
  authController.login,
);

// Requires a valid JWT.
router.get('/me', authenticate, authController.me);

export default router;
