import type { Response } from 'express';

/** Standard envelope returned by every successful API response. */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/** Standard envelope returned for error responses. */
export interface ErrorResponse {
  success: false;
  message: string;
  details?: unknown;
}

/**
 * Send a consistent, typed success payload. Centralizing the envelope shape
 * keeps every endpoint's response structure predictable for the frontend.
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  message?: string,
): Response<SuccessResponse<T>> => {
  return res.status(statusCode).json({ success: true, data, message });
};
