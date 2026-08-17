import { createApp } from './app.js';
import { migrate } from './database/migrate.js';
import { env } from './config/env.js';

async function main(): Promise<void> {
  console.log('[findsity] starting backend…');
  await migrate();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`[findsity] API ready → http://localhost:${env.port}`);
    console.log(`[findsity] health check → http://localhost:${env.port}/api/health`);
  });
}

main().catch((err) => {
  console.error('[findsity] failed to start', err);
  process.exit(1);
});