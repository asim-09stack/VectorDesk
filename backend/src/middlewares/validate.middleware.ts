import type { NextFunction, Request, Response } from 'express';
import type { AnyZodObject, ZodEffects } from 'zod';

type Schema = AnyZodObject | ZodEffects<AnyZodObject>;

/**
 * Factory that returns middleware which validates and coerces parts of the
 * request against Zod schemas. On success the parsed (typed) values replace
 * the originals; on failure a `ZodError` is thrown and handled centrally by
 * the global error middleware (→ 400 with field details).
 *
 * @example
 * router.post('/login', validate({ body: loginSchema }), controller.login);
 */
export const validate =
  (schemas: { body?: Schema; params?: Schema; query?: Schema }) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) req.body = await schemas.body.parseAsync(req.body);
      if (schemas.params)
        req.params = await schemas.params.parseAsync(req.params);
      if (schemas.query)
        // `req.query` has only a getter in Express 5; assign defensively.
        Object.assign(req.query, await schemas.query.parseAsync(req.query));
      next();
    } catch (error) {
      next(error);
    }
  };
