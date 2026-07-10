import type { NextFunction, Response } from 'express';
import { verifyToken } from '@/utils/jwt';
import { ForbiddenError, UnauthorizedError } from '@/utils/errors';
import type { AuthenticatedRequest, UserRole } from '@/types';

/**
 * Authentication middleware.
 *
 * Extracts the bearer token from the `Authorization` header, verifies it, and
 * attaches the decoded principal to `req.user`. Throws 401 if the token is
 * missing or invalid.
 */
export const authenticate = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authentication required');
  }

  const token = header.slice('Bearer '.length).trim();
  const payload = verifyToken(token);

  req.user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
  };

  next();
};

/**
 * Authorization middleware factory. Restricts a route to one or more roles.
 * Must be used after `authenticate`.
 *
 * @example
 * router.post('/upload', authenticate, authorize('ADMIN'), controller.upload);
 */
export const authorize =
  (...allowedRoles: UserRole[]) =>
  (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        'You do not have permission to perform this action',
      );
    }
    next();
  };
