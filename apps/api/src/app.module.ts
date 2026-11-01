import { type DynamicModule, Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { seconds, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import type { DestinationStream } from 'pino';
import { ProblemDetailsFilter } from './common/errors/problem-details.filter.js';
import { toValidationFailedException } from './common/errors/validation-failed.exception.js';
import { buildLoggerParams } from './common/logging/logger-params.js';
import type { Env } from './config/env.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({})
export class AppModule {
  static forRoot(env: Env, options: { logDestination?: DestinationStream } = {}): DynamicModule {
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
        LoggerModule.forRoot(buildLoggerParams(env, options.logDestination)),
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: seconds(env.RATE_LIMIT_TTL_SECONDS), limit: env.RATE_LIMIT_MAX }],
        }),
        HealthModule,
      ],
      providers: [
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
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
