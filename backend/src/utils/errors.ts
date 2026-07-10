/**
 * Base class for all known/expected application errors.
 *
 * `isOperational` distinguishes errors we anticipate and handle gracefully
 * (bad input, missing resource, auth failure) from unexpected programmer
 * errors or crashes. The global error handler uses this to decide how much
 * detail to expose to the client.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode = 500,
    isOperational = true,
    details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    // Restore prototype chain (required when extending built-ins in TS).
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/** 400 - The request was malformed or failed validation. */
export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown) {
    super(message, 400, true, details);
  }
}

/** 401 - Authentication is required or failed. */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, true);
  }
}

/** 403 - Authenticated but not permitted to perform this action. */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, true);
  }
}

/** 404 - The requested resource does not exist. */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, true);
  }
}

/** 409 - The request conflicts with the current state (e.g. duplicate email). */
export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409, true);
  }
}

/** 502 - A required upstream dependency (Ollama, ChromaDB) failed. */
export class ServiceUnavailableError extends AppError {
  constructor(message = 'Upstream service unavailable', details?: unknown) {
    super(message, 502, true, details);
  }
}
