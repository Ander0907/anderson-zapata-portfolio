import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../support/create-test-app.js';
import { FixtureModule } from '../support/fixtures.module.js';
import { sharedLogs } from '../support/log-collector.js';

describe('Error log carries the traceId (A3, ADR-013, ADR-014)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp({ fixtures: [FixtureModule] });
  });

  beforeEach(() => {
    sharedLogs.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  it('records the traceId of a 500 in the ERROR entry', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/fixtures/boom')
      .set('X-Request-Id', 'client-id-500');

    expect(response.status).toBe(500);
    const errorEntry = sharedLogs.entries().find((entry) => entry.severity === 'ERROR');
    expect(errorEntry).toBeDefined();
    expect(errorEntry?.traceId).toBe('client-id-500');
  });
});
