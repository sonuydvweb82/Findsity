import { migrate } from '../src/database/migrate.js';
import { closeDb } from '../src/database/connection.js';

migrate()
  .catch((err) => {
    console.error('[migrate] failed', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });