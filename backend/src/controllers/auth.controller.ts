import type { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/apiResponse';
import { UnauthorizedError } from '@/utils/errors';
import * as authService from '@/services/auth.service';
import type {
  LoginInput,
  RegisterInput,
} from '@/validators/auth.validator';
import type { AuthenticatedRequest } from '@/types';

/** POST /auth/register — create an account and return a JWT. */
export const register = asyncHandler<unknown, unknown, RegisterInput>(
  async (req, res: Response) => {
    const result = await authService.register(req.body);
    sendSuccess(res, result, 201, 'Account created successfully');
  },
);

/** POST /auth/login — authenticate and return a JWT. */
export const login = asyncHandler<unknown, unknown, LoginInput>(
  async (req, res: Response) => {
    const result = await authService.login(req.body);
    sendSuccess(res, result, 200, 'Logged in successfully');
  },
);

/** GET /auth/me — return the currently authenticated user's profile. */
export const me = asyncHandler(async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  if (!user) throw new UnauthorizedError();
  const profile = await authService.getProfile(user.id);
  sendSuccess(res, profile);
});
