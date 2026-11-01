import { createApp } from './app.setup.js';
import { loadEnv } from './config/env.js';

/**
 * Starts the API: loads the configuration, builds the application and serves it on `PORT`.
 *
 * It binds every interface because Cloud Run reaches the container from outside. Any failure
 * rejects the returned promise, which the handler below reports.
 */
async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await createApp(env);
  await app.listen(env.PORT, '0.0.0.0');
}

// The logger may not exist yet, so this writes the JSON line itself. parseEnv errors name variables,
// never values. process.exit: a failed listen can leave handles open that would keep this alive.
bootstrap().catch((error: unknown) => {
  const detail = error instanceof Error ? error.stack : String(error);
  console.error(JSON.stringify({ severity: 'CRITICAL', msg: 'Startup failed', err: detail }));
  process.exit(1);
});
