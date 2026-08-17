import { Pool, type PoolClient } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export type Row = Record<string, unknown>;

export type QueryFn = {
  <T extends object = Row>(text: string, params?: unknown[]): Promise<T[]>;
};

let pool: Pool | null = null;
let pglite: PGlite | null = null;
const mode: 'pg' | 'pglite' = env.databaseUrl ? 'pg' : 'pglite';

async function getPool(): Promise<Pool> {
  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl,
      max: 10,
    });
    pool.on('error', (err) => {
      console.error('[db] idle client error', err.message);
    });
  }
  return pool;
}

async function getPglite(): Promise<PGlite> {
  if (!pglite) {
    const dataDir = join(__dirname, '..', '..', 'data');
    mkdirSync(dataDir, { recursive: true });
    console.log(`[db] using embedded PostgreSQL (PGlite) â€” data dir: ${dataDir}`);
    pglite = new PGlite(dataDir);
    await pglite.waitReady;
  }
  return pglite;
}

export function getDbMode(): 'pg' | 'pglite' {
  return mode;
}

export async function query<T extends object = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  if (mode === 'pg') {
    const p = await getPool();
    const res = await p.query(text, params as never[]);
    return res.rows as T[];
  }
  const db = await getPglite();
  const res = await db.query<T>(text, params as never[]);
  return res.rows as T[];
}

export async function queryOne<T extends object = Row>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Runs a block inside a single transaction. `fn` receives a `q` function that
 * executes statements inside the transaction. If `fn` throws, the transaction
 * is rolled back.
 */
export async function transaction<T>(
  fn: (q: QueryFn) => Promise<T>,
): Promise<T> {
  if (mode === 'pg') {
    const p = await getPool();
    const client: PoolClient = await p.connect();
    try {
      await client.query('BEGIN');
      const q: QueryFn = async <R extends object = Row>(text: string, params: unknown[] = []) =>
        (await client.query(text, params as never[])).rows as R[];
      const result = await fn(q);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* ignore */
      }
      throw err;
    } finally {
      client.release();
    }
  }
  const db = await getPglite();
  return db.transaction(async (tx) => {
    const q: QueryFn = async <R extends object = Row>(text: string, params: unknown[] = []) =>
      (await tx.query<R>(text, params as never[])).rows as R[];
    return fn(q);
  });
}

export async function closeDb(): Promise<void> {
  if (pool) await pool.end();
  if (pglite) await pglite.close();
}
