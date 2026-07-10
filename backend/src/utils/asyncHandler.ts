import type { NextFunction, Request, Response, RequestHandler } from 'express';

/**
 * Wraps an async Express handler so any rejected promise is forwarded to
 * `next()` and handled by the global error middleware. This removes the need
 * for a try/catch block in every controller.
 *
 * @example
 * router.get('/', asyncHandler(async (req, res) => { ... }));
 */
export const asyncHandler = <
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = qs.ParsedQs,
>(
  fn: (
    req: Request<P, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction,
  ) => Promise<unknown>,
): RequestHandler<P, ResBody, ReqBody, ReqQuery> => {
  return (req, res, next): void => {
    fn(req, res, next).catch(next);
  };
};

// Minimal ambient reference so the ReqQuery default above resolves without
// importing the full `qs` types package.
declare namespace qs {
  interface ParsedQs {
    [key: string]: undefined | string | string[] | ParsedQs | ParsedQs[];
  }
}
