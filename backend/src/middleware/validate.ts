import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { ApiError } from '../utils/errors.js';

/** Validates req.body (or another part) against a zod schema. */
export const validate =
  (schema: ZodSchema, part: 'body' | 'query' | 'params' = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[part]);
      const key = part === 'body' ? 'validated' : part === 'query' ? 'validatedQuery' : 'validatedParams';
      (req as Request & Record<string, unknown>)[key] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const first = err.issues[0];
        next(
          ApiError.badRequest(
            first ? `${first.path.join('.')}: ${first.message}` : 'Invalid input',
            'VALIDATION_ERROR',
          ),
        );
        return;
      }
      next(err);
    }
  };