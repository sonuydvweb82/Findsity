import type { AuthUser } from '../middleware/auth.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      validated?: unknown;
      validatedQuery?: unknown;
      validatedParams?: unknown;
    }
  }
}

export {};