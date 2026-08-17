import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';

interface ErrorWithStatus extends Error {
  status?: number;
  code?: string;
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Route not found', code: 'NOT_FOUND' });
}

export function errorHandler(err: ErrorWithStatus, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: err.issues[0] ? `${err.issues[0].path.join('.')}: ${err.issues[0].message}` : 'Invalid input',
      code: 'VALIDATION_ERROR',
    });
    return;
  }

  const status = err.status || 500;
  if (status === 500) {
    console.error('[error]', err);
  }

  const message =
    status === 500
      ? 'Something went wrong on our side. Please try again.'
      : err.message || 'Something went wrong';

  res.status(status).json({
    error: message,
    code: err.code || 'ERROR',
    ...(env.nodeEnv === 'development' && status === 500 ? { detail: err.message } : {}),
  });
}