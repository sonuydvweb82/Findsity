import { randomBytes } from 'node:crypto';

/** Generates a short public item id like "FD-4K2X9Q". */
export function generateItemUid(): string {
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `FD-${suffix}`;
}

/** Generates a short public claim id like "CL-7MZP". */
export function generateClaimUid(): string {
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `CL-${suffix}`;
}