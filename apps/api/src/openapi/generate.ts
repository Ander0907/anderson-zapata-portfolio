import { writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../app.module.js';
import { configureApp, NEST_APP_OPTIONS } from '../app.setup.js';
import { parseEnv } from '../config/env.js';
import { buildOpenApiDocument } from './openapi.js';

const OUTPUT = new URL('../../openapi.json', import.meta.url);

/** Same wiring as main.ts without `listen`; a fixed env keeps it free of secrets and deterministic. */
async function generate(): Promise<void> {
  const env = parseEnv({ NODE_ENV: 'test', LOG_LEVEL: 'silent' });
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule.forRoot(env),
    NEST_APP_OPTIONS,
  );
  configureApp(app, env);
  await app.init();
  writeFileSync(OUTPUT, `${JSON.stringify(buildOpenApiDocument(app), null, 2)}\n`);
  await app.close();
}

generate().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
