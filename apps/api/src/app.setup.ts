import { type NestApplicationOptions, VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { rejectMalformedJson } from './common/http/malformed-json.js';
import { assignRequestId } from './common/http/request-id.js';
import type { Env } from './config/env.js';

export const NEST_APP_OPTIONS: NestApplicationOptions = { bufferLogs: true, bodyParser: false };

export function configureApp(app: NestExpressApplication, env: Env): void {
  app.useLogger(app.get(Logger));
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableShutdownHooks();
  app.use(assignRequestId);
  app.use(helmet());
  if (env.CORS_ALLOWED_ORIGINS.length > 0) {
    app.enableCors({
      origin: env.CORS_ALLOWED_ORIGINS,
      credentials: true,
      methods: ['GET', 'HEAD', 'POST'],
    });
  }
  app.useBodyParser('json');
  app.use(rejectMalformedJson);
}
