import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';

/** Feature module of the liveness endpoint. */
@Module({ controllers: [HealthController] })
export class HealthModule {}
