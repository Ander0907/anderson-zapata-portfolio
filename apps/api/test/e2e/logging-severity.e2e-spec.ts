import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../support/create-test-app.js';
import { FixtureModule } from '../support/fixtures.module.js';
import { sharedLogs } from '../support/log-collector.js';

// Separate file: needs LOG_LEVEL=trace, fixed per spec file by nestjs-pino.
describe('Cloud Logging severity names (A3, ADR-014, D13)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp({ fixtures: [FixtureModule], env: { LOG_LEVEL: 'trace' } });
  });

  beforeEach(() => {
    sharedLogs.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['trace', 'DEBUG'],
    ['debug', 'DEBUG'],
    ['info', 'INFO'],
    ['warn', 'WARNING'],
    ['error', 'ERROR'],
    ['fatal', 'CRITICAL'],
  ])('maps the pino level %s to the Cloud Logging severity %s', async (level, severity) => {
    await request(app.getHttpServer()).get(`/v1/fixtures/log-level/${level}`).expect(200);

    const entry = sharedLogs.entries().find((e) => e.marker === `level-${level}`);
    expect(entry?.severity).toBe(severity);
  });
});
