import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '@/config';
import { UnauthorizedError } from '@/utils/errors';
import type { JwtPayload } from '@/types';

/**
 * Sign a JWT for an authenticated user.
 *
 * @param payload - Non-sensitive claims to embed (user id, email, role).
 * @returns A signed, time-limited token string.
 */
export const signToken = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, config.jwt.secret, options);
};

/**
 * Verify and decode a JWT.
 *
 * @throws {UnauthorizedError} if the token is missing, expired, or invalid.
 */
export const verifyToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    // `jwt.verify` returns string | JwtPayload; we only ever sign objects.
    if (typeof decoded === 'string') {
      throw new UnauthorizedError('Invalid token payload');
    }
    return decoded as unknown as JwtPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
};
