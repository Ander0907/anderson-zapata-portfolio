import type { Type } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { DestinationStream } from 'pino';
import { configureApp, NEST_APP_OPTIONS } from '../../src/app.setup.js';
import { AppModule } from '../../src/app.module.js';
import { parseEnv } from '../../src/config/env.js';
import { sharedLogs } from './log-collector.js';

export interface TestAppOptions {
  /** Environment variables on top of NODE_ENV=test; they go through parseEnv like in production. */
  env?: Record<string, string | undefined>;
  /** Fixture modules (throwaway controllers); never part of src/. */
  fixtures?: Type<unknown>[];
  logDestination?: DestinationStream;
}

/** Builds a real app from AppModule.forRoot, configured exactly as main.ts does. */
export async function createTestApp(options: TestAppOptions = {}): Promise<NestExpressApplication> {
  const env = parseEnv({ NODE_ENV: 'test', LOG_LEVEL: 'info', ...options.env });
  const moduleRef = await Test.createTestingModule({
    imports: [
      AppModule.forRoot(env, { logDestination: options.logDestination ?? sharedLogs.destination }),
      ...(options.fixtures ?? []),
    ],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>(NEST_APP_OPTIONS);
  configureApp(app, env);
  await app.init();
  return app;
}
