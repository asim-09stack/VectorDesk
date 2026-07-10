import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '@/utils/errors';
import type { ErrorResponse } from '@/utils/apiResponse';
import { config } from '@/config';
import { logger } from '@/utils/logger';

/**
 * Structural type guard for Prisma's `PrismaClientKnownRequestError`.
 *
 * We detect it by shape (a string `code` beginning with "P") rather than by
 * importing the generated `Prisma` namespace. This keeps the error handler
 * decoupled from the generated client and avoids a hard build dependency on
 * `prisma generate` having run.
 */
interface PrismaKnownError {
  name: string;
  code: string;
  meta?: Record<string, unknown>;
}

const isPrismaKnownError = (err: unknown): err is PrismaKnownError => {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string' &&
    (err as { code: string }).code.startsWith('P') &&
    (err as { name?: unknown }).name === 'PrismaClientKnownRequestError'
  );
};

/**
 * Fallback handler for any route that was not matched. Produces a 404 that
 * flows through the standard error handler below.
 */
export const notFoundHandler: RequestHandler = (req, res) => {
  const body: ErrorResponse = {
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  };
  res.status(404).json(body);
};

/**
 * Global error-handling middleware. This is the single place where errors are
 * translated into HTTP responses, so controllers/services can simply throw.
 *
 * It normalizes several error types:
 *  - `AppError`      → its own status code and message
 *  - `ZodError`      → 400 with field-level validation details
 *  - Prisma errors   → mapped to sensible HTTP codes (e.g. unique → 409)
 *  - anything else   → 500 (details hidden in production)
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: unknown;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    details = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
  } else if (isPrismaKnownError(err)) {
    // P2002 = unique constraint violation, P2025 = record not found.
    if (err.code === 'P2002') {
      statusCode = 409;
      message = 'A record with these details already exists';
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Requested record was not found';
    } else {
      statusCode = 400;
      message = 'Database request error';
    }
  } else if (err instanceof Error) {
    message = err.message || message;
  }

  // Log 5xx as errors (unexpected), 4xx as warnings (client mistakes).
  const logPayload = { statusCode, details, stack: (err as Error)?.stack };
  if (statusCode >= 500) {
    logger.error(message, logPayload);
  } else {
    logger.warn(message, { statusCode, details });
  }

  const body: ErrorResponse = {
    success: false,
    message,
    // Never leak internal error details to clients in production.
    ...(details !== undefined && !config.isProduction ? { details } : {}),
  };

  res.status(statusCode).json(body);
};
