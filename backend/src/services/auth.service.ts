import type { User } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { hashPassword, comparePassword } from '@/utils/password';
import { signToken } from '@/utils/jwt';
import { ConflictError, UnauthorizedError } from '@/utils/errors';
import type { UserRole } from '@/types';
import type { LoginInput, RegisterInput } from '@/validators/auth.validator';

/** Public-safe representation of a user (never exposes the password hash). */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

/** Result returned by register/login: the user plus a signed JWT. */
export interface AuthResult {
  user: PublicUser;
  token: string;
}

/** Strip sensitive fields before returning a user to clients. */
const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

/** Issue a JWT for a persisted user record. */
const issueToken = (user: User): string =>
  signToken({ sub: user.id, email: user.email, role: user.role });

/**
 * Register a new user account.
 * @throws {ConflictError} if the email is already registered.
 */
export const register = async (input: RegisterInput): Promise<AuthResult> => {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: passwordHash,
      // New self-service registrations are always regular users.
      role: 'USER',
    },
  });

  return { user: toPublicUser(user), token: issueToken(user) };
};

/**
 * Authenticate an existing user by email + password.
 * @throws {UnauthorizedError} on unknown email or bad password.
 *
 * Note: the same error is returned for both cases so we don't leak whether an
 * email is registered.
 */
export const login = async (input: LoginInput): Promise<AuthResult> => {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const isValid = await comparePassword(input.password, user.password);
  if (!isValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  return { user: toPublicUser(user), token: issueToken(user) };
};

/** Fetch the current user's public profile by id. */
export const getProfile = async (userId: string): Promise<PublicUser> => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return toPublicUser(user);
};
