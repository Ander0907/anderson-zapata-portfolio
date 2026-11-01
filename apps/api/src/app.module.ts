import { type DynamicModule, Module } from '@nestjs/common';
import type { DestinationStream } from 'pino';
import type { Env } from './config/env.js';

@Module({})
export class AppModule {
  // Inert seam: the real wiring arrives with the GREEN step.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static forRoot(_env: Env, _options?: { logDestination?: DestinationStream }): DynamicModule {
    return { module: AppModule };
  }
}
