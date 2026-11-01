import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp, NEST_APP_OPTIONS } from './app.setup.js';
import { loadEnv } from './config/env.js';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule.forRoot(env),
    NEST_APP_OPTIONS,
  );
  configureApp(app, env);
  await app.listen(env.PORT, '0.0.0.0');
}

// The logger may not exist yet, so this writes the JSON line itself. parseEnv errors name variables,
// never values. process.exit: a failed listen can leave handles open that would keep this alive.
bootstrap().catch((error: unknown) => {
  const detail = error instanceof Error ? error.stack : String(error);
  console.error(JSON.stringify({ severity: 'CRITICAL', msg: 'Startup failed', err: detail }));
  process.exit(1);
});
