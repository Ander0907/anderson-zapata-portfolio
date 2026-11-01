import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../support/create-test-app.js';
import { FixtureModule } from '../support/fixtures.module.js';
import { type LogEntry, sharedLogs } from '../support/log-collector.js';

const SENSITIVE = [
  '203.0.113.9',
  '198.51.100.7',
  'https://referer.example/private-path',
  'api-key-value-123',
  'origin-secret-456',
  'code=abc',
  'a@b.c',
];

const completionOf = (entries: LogEntry[]): LogEntry | undefined =>
  entries.find((entry) => entry.res !== undefined);

describe('Request log allowlist (A3, ADR-014, D13)', () => {
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

  const send = () =>
    request(app.getHttpServer())
      .get('/v1/fixtures/ping?code=abc&email=a@b.c')
      .set('X-Request-Id', 'client-id-42')
      .set('X-Forwarded-For', '203.0.113.9')
      .set('CF-Connecting-IP', '198.51.100.7')
      .set('Referer', 'https://referer.example/private-path')
      .set('X-Api-Key', 'api-key-value-123')
      .set('X-Origin-Secret', 'origin-secret-456');

  it('never writes sensitive headers or query values into any log entry', async () => {
    await send().expect(200);

    expect(sharedLogs.entries().length).toBeGreaterThan(0);
    for (const value of SENSITIVE) {
      expect(sharedLogs.raw(), `leaked ${value}`).not.toContain(value);
    }
  });

  it('logs the id, method, path without query and status of the request', async () => {
    await send().expect(200);

    const entry = completionOf(sharedLogs.entries());
    expect(entry?.req).toMatchObject({
      id: 'client-id-42',
      method: 'GET',
      url: '/v1/fixtures/ping',
    });
    expect(entry?.res).toMatchObject({ statusCode: 200 });
  });

  it('logs no request or response header object at all', async () => {
    await send().expect(200);

    for (const entry of sharedLogs.entries()) {
      expect(entry.req ?? {}).not.toHaveProperty('headers');
      expect(entry.res ?? {}).not.toHaveProperty('headers');
    }
  });
});
