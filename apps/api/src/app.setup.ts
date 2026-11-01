import type { NestApplicationOptions } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Env } from './config/env.js';

// Inert seams: the real setup arrives with the GREEN step.
export const NEST_APP_OPTIONS: NestApplicationOptions = {};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function configureApp(_app: NestExpressApplication, _env: Env): void {}
