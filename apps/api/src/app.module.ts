import { type DynamicModule, Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { seconds, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import type { DestinationStream } from 'pino';
import { pinoHttp } from 'pino-http';
import { ProblemDetailsFilter } from './common/errors/problem-details.filter.js';
import { toValidationFailedException } from './common/errors/validation-failed.exception.js';
import { buildRequestLoggerOptions, REQUEST_LOGGER } from './common/logging/logger-params.js';
import type { Env } from './config/env.js';
import { HealthModule } from './modules/health/health.module.js';

/** Root module: assembles configuration, logging, rate limiting and the feature modules. */
@Module({})
export class AppModule {
  /**
   * Builds the root module from an already validated environment.
   *
   * Registers, for the whole application, the problem details filter, the throttler guard (with its
   * counters in memory, ADR-008) and the validation pipe, which only checks parameters that declare
   * a `schema`. It also creates the request logger, which `configureApp` mounts.
   *
   * @param env - Result of `parseEnv`, the only configuration source.
   * @param options - `logDestination` receives the log lines instead of stdout; tests use it.
   * @returns The dynamic module to hand to Nest.
   */
  static forRoot(env: Env, options: { logDestination?: DestinationStream } = {}): DynamicModule {
    const loggerOptions = buildRequestLoggerOptions(env, options.logDestination);
    return {
      module: AppModule,
      imports: [
        // `env` already went through parseEnv and is the only source: `load` hands it over without
        // reading .env files or process.env, and without writing back to process.env.
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          validatePredefined: false,
          skipProcessEnv: true,
          load: [() => env],
        }),
        // `useExisting`: pino-http is mounted by configureApp, so this only binds `req.log`.
        LoggerModule.forRoot({ pinoHttp: loggerOptions, useExisting: true }),
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: seconds(env.RATE_LIMIT_TTL_SECONDS), limit: env.RATE_LIMIT_MAX }],
        }),
        HealthModule,
      ],
      providers: [
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: REQUEST_LOGGER, useValue: pinoHttp(loggerOptions) },
        {
          provide: APP_PIPE,
          useValue: new StandardSchemaValidationPipe({
            exceptionFactory: toValidationFailedException,
          }),
        },
      ],
    };
  }
}
