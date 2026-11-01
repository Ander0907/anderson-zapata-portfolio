import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../support/create-test-app.js';
import { FixtureModule } from '../support/fixtures.module.js';
import { requestIdOf, sharedLogs } from '../support/log-collector.js';

// configureApp promises the request logger runs before CORS answers a preflight.
describe('Preflight requests are logged and carry a request id (B2, A3, ADR-014)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp({
      fixtures: [FixtureModule],
      env: { CORS_ALLOWED_ORIGINS: 'https://app.example' },
    });
  });

  beforeEach(() => {
    sharedLogs.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['an allowed origin', 'https://app.example'],
    ['an origin that is not allowed', 'https://evil.example'],
  ])('sends X-Request-Id and logs an entry with that id for %s', async (_name, origin) => {
    const response = await request(app.getHttpServer())
      .options('/v1/fixtures/raw')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'POST');

    const id = response.headers['x-request-id'];
    expect(typeof id).toBe('string');
    expect(sharedLogs.entries().some((entry) => requestIdOf(entry) === id)).toBe(true);
  });
});
