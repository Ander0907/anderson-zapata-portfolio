import { type NestApplicationOptions, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import type { DestinationStream } from 'pino';
import { AppModule } from './app.module.js';
import { translateBodyParserError } from './common/http/body-parser-errors.js';
import { REQUEST_LOGGER } from './common/logging/logger-params.js';
import type { Env } from './config/env.js';
import { buildOpenApiDocument } from './openapi/openapi.js';

const JSON_BODY_LIMIT = '16kb';
/** Makes `req.ip`, the throttler's tracker, the entry added by our proxy, not one the client chose. */
const TRUSTED_PROXY_HOPS = 1;

export const NEST_APP_OPTIONS: NestApplicationOptions = {
  bufferLogs: true,
  bodyParser: false,
  // Startup errors reach the caller of createApp instead of Nest's own process.exit.
  abortOnError: false,
};

function enableCorsForListedOrigins(app: NestExpressApplication, origins: string[]): void {
  if (origins.length === 0) return;
  app.enableCors({ origin: origins, credentials: true, methods: ['GET', 'HEAD', 'POST'] });
}

function parseJsonBodies(app: NestExpressApplication): void {
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  app.use(translateBodyParserError);
}

function serveDocsOutsideProduction(app: NestExpressApplication, env: Env): void {
  if (env.NODE_ENV === 'production') return;
  SwaggerModule.setup('docs', app, () => buildOpenApiDocument(app));
}

/**
 * Middleware runs in registration order. The request logger comes first so that whatever reaches
 * Express, even if later rejected, gets an id and a log entry; Node's own 400/431 never get here.
 */
export function configureApp(app: NestExpressApplication, env: Env): void {
  app.useLogger(app.get(Logger));
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableShutdownHooks();
  app.set('trust proxy', TRUSTED_PROXY_HOPS);
  app.use(app.get(REQUEST_LOGGER));
  app.use(helmet());
  enableCorsForListedOrigins(app, env.CORS_ALLOWED_ORIGINS);
  parseJsonBodies(app);
  serveDocsOutsideProduction(app, env);
}

export async function createApp(
  env: Env,
  options: { logDestination?: DestinationStream } = {},
): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule.forRoot(env, options),
    NEST_APP_OPTIONS,
  );
  configureApp(app, env);
  return app;
}
