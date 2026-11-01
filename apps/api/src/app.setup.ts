import { type NestApplicationOptions, VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { rejectMalformedJson } from './common/http/malformed-json.js';
import { assignRequestId } from './common/http/request-id.js';
import type { Env } from './config/env.js';

export const NEST_APP_OPTIONS: NestApplicationOptions = { bufferLogs: true, bodyParser: false };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function configureApp(app: NestExpressApplication, _env: Env): void {
  app.useLogger(app.get(Logger));
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.use(assignRequestId);
  app.useBodyParser('json');
  app.use(rejectMalformedJson);
}
