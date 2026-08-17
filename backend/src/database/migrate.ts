import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transaction } from './connection.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIGRATIONS: string[] = [
  // Handover workflow: proposal + acceptance states.
  `ALTER TABLE handovers ADD COLUMN IF NOT EXISTS claimant_accepted_at TIMESTAMPTZ`,
  `ALTER TABLE handovers ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ`,
  `ALTER TABLE handovers DROP CONSTRAINT IF EXISTS handovers_status_check`,
  `UPDATE handovers SET status = 'pending' WHERE status = 'scheduled' AND (pickup_location IS NULL OR pickup_location = '')`,
  `ALTER TABLE handovers ADD CONSTRAINT handovers_status_check CHECK (status IN ('pending', 'proposed', 'scheduled', 'handed_over', 'completed'))`,
  // Return timestamps.
  `ALTER TABLE items ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ`,
  `ALTER TABLE claims ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ`,
];

export async function migrate(): Promise<void> {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8')
    .replace(/^--.*$/gm, '')
    .trim();
  const statements = schema
    .split(/;\s*\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  await transaction(async (q) => {
    for (const stmt of statements) {
      await q(stmt);
    }
    for (const stmt of MIGRATIONS) {
      await q(stmt);
    }
  });
  console.log(`[db] schema applied successfully (${statements.length} statements, ${MIGRATIONS.length} migrations)`);
}