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

/** Largest accepted JSON body (rule D5); a larger one gets a 413. */
const JSON_BODY_LIMIT = '16kb';
/**
 * Makes `req.ip`, the throttler's tracker, the entry added by our proxy, not one the client chose.
 *
 * Whether one hop is right behind Cloudflare is still pending validation (ADR-011).
 */
const TRUSTED_PROXY_HOPS = 1;

/**
 * Nest options of the application, shared with the test harness so tests boot like production.
 *
 * `bufferLogs` holds Nest's logs until `configureApp` installs pino. `bodyParser: false` removes
 * Nest's default parsers, because `configureApp` mounts its own JSON parser, after the request
 * logger and with a size limit.
 */
export const NEST_APP_OPTIONS: NestApplicationOptions = {
  bufferLogs: true,
  bodyParser: false,
  // Startup errors reach the caller of createApp instead of Nest's own process.exit.
  abortOnError: false,
};

/**
 * Allows credentialed browser calls from the listed origins, for a cross-origin deployment.
 *
 * With no origins, CORS stays off and no `Access-Control-*` header is sent: the planned deployment
 * is same-origin behind Cloudflare (ADR-011), and the list exists for its plan B (development
 * manual, section 7.5).
 *
 * @param app - Application being configured.
 * @param origins - Exact allowed origins; empty to keep CORS off.
 */
function enableCorsForListedOrigins(app: NestExpressApplication, origins: string[]): void {
  if (origins.length === 0) return;
  app.enableCors({ origin: origins, credentials: true, methods: ['GET', 'HEAD', 'POST'] });
}

/**
 * Mounts the only body parser, with its size limit, followed by the translation of its errors.
 *
 * The translation must come after the parser, or it would not receive the parser's errors.
 *
 * @param app - Application being configured.
 */
function parseJsonBodies(app: NestExpressApplication): void {
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  app.use(translateBodyParserError);
}

/**
 * Serves Swagger UI at `/docs`, and the OpenAPI document with it, except in production (rule D16).
 *
 * @param app - Application to document.
 * @param env - Validated configuration, whose `NODE_ENV` decides.
 */
function serveDocsOutsideProduction(app: NestExpressApplication, env: Env): void {
  if (env.NODE_ENV === 'production') return;
  SwaggerModule.setup('docs', app, () => buildOpenApiDocument(app));
}

/**
 * Applies the HTTP setup shared by production and the e2e harness; call it before `app.init()`.
 *
 * Middleware runs in registration order. The request logger comes first so that whatever reaches
 * Express, even if later rejected, gets an id and a log entry; Node's own 400/431 never get here.
 * Nest adds the routes and its error handler during init, so they end up behind all of this.
 *
 * @param app - Application created with {@link NEST_APP_OPTIONS}.
 * @param env - Validated configuration; sets the CORS origins and whether the docs are served.
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

/**
 * Creates the fully configured application, for `main.ts` and the OpenAPI generator.
 *
 * A startup failure rejects the returned promise, because `abortOnError` is off.
 *
 * @param env - Validated configuration.
 * @param options - `logDestination` receives the log lines instead of stdout; tests use it.
 * @returns The application, configured but neither initialized nor listening.
 */
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
