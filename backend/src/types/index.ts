import type { Request } from 'express';

/** Roles supported by the application. */
export type UserRole = 'ADMIN' | 'USER';

/** Message author roles used in chat conversations. */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * The authenticated principal decoded from a valid JWT and attached to the
 * request by the auth middleware.
 */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

/** JWT payload shape signed on login/register. */
export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
}

/**
 * Express request augmented with the authenticated user. Controllers behind
 * the auth middleware can rely on `req.user` being present.
 */
export interface AuthenticatedRequest<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = unknown,
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user?: AuthUser;
}

/**
 * A single retrieved chunk used as grounding context, surfaced back to the
 * client as a citation.
 */
export interface Citation {
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  text: string;
  score: number;
}
