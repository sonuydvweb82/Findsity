export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = 'ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }

  static badRequest(message: string, code = 'BAD_REQUEST') {
    return new ApiError(400, message, code);
  }
  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED') {
    return new ApiError(401, message, code);
  }
  static forbidden(message = 'You do not have permission to do that', code = 'FORBIDDEN') {
    return new ApiError(403, message, code);
  }
  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new ApiError(404, message, code);
  }
  static conflict(message: string, code = 'CONFLICT') {
    return new ApiError(409, message, code);
  }
  static tooMany(message = 'Too many requests, please slow down', code = 'RATE_LIMITED') {
    return new ApiError(429, message, code);
  }
}

/** Wraps an async express handler so rejected promises reach the error middleware. */
export const asyncHandler =
  (fn: (req: unknown, res: unknown, next: unknown) => Promise<unknown>) =>
  (req: unknown, res: unknown, next: unknown): void => {
    Promise.resolve(fn(req, res, next)).catch(next as (reason: unknown) => void);
  };

/** Wraps every function of a controller namespace so rejected promises reach the error middleware. */
export const wrapController = <T extends Record<string, unknown>>(ctrl: T): T => {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(ctrl)) {
    out[key] = typeof value === 'function' ? asyncHandler(value as never) : value;
  }
  return out as T;
};