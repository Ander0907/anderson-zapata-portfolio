import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestAppOptions } from '../support/create-test-app.js';
import { FixtureModule } from '../support/fixtures.module.js';
import { type LogEntry, requestIdOf, sharedLogs } from '../support/log-collector.js';

const SECRET = 'secret-query-marker-991';
const statusOf = (entry: LogEntry): unknown =>
  (entry.res as { statusCode?: number } | undefined)?.statusCode ?? entry.status;

describe('Logging of rejected requests (A3, B3, B4, ADR-013, ADR-014)', () => {
  let app: NestExpressApplication | undefined;

  const start = async (options: TestAppOptions = {}) => {
    app = await createTestApp({ fixtures: [FixtureModule], ...options });
    return app.getHttpServer();
  };

  beforeEach(() => {
    sharedLogs.clear();
  });

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  describe('query strings never reach the log', () => {
    it('omits the query of a 400 caused by a malformed URI', async () => {
      const response = await request(await start())
        .get(`/v1/fixtures/p/%E0%A4%A?token=${SECRET}`)
        .set('X-Request-Id', 'id-malformed');

      expect(response.status).toBe(400);
      const logged = sharedLogs.entries().filter((e) => requestIdOf(e) === 'id-malformed');
      expect(logged.length).toBeGreaterThan(0);
      expect(
        logged.every((e) => (e.req as { url?: string }).url === '/v1/fixtures/p/%E0%A4%A'),
      ).toBe(true);
      expect(sharedLogs.raw()).not.toContain(SECRET);
    });

    it('omits the query of a request rejected by the body parser', async () => {
      const response = await request(await start())
        .post(`/v1/fixtures/raw?token=${SECRET}`)
        .set('Content-Type', 'application/json')
        .set('X-Request-Id', 'id-parser')
        .send('{"broken": ');

      expect(response.status).toBe(400);
      const logged = sharedLogs.entries().filter((e) => requestIdOf(e) === 'id-parser');
      expect(logged.some((e) => e.severity === 'WARNING')).toBe(true);
      expect(logged.every((e) => (e.req as { url?: string }).url === '/v1/fixtures/raw')).toBe(
        true,
      );
      expect(sharedLogs.raw()).not.toContain(SECRET);
    });
  });

  describe('415 and 429 are logged with the request id and status', () => {
    it('logs a 415 with the request id and its status', async () => {
      const response = await request(await start())
        .post('/v1/fixtures/raw')
        .set('Content-Type', 'application/json; charset=iso-8859-1')
        .set('X-Request-Id', 'id-415')
        .send('{"a":1}');

      expect(response.status).toBe(415);
      const logged = sharedLogs.entries().filter((e) => requestIdOf(e) === 'id-415');
      expect(logged.length).toBeGreaterThan(0);
      expect(logged.some((e) => statusOf(e) === 415)).toBe(true);
    });

    it('logs a 429 with the request id and its status', async () => {
      const server = await start({ env: { RATE_LIMIT_MAX: '1', RATE_LIMIT_TTL_SECONDS: '60' } });
      await request(server).get('/v1/fixtures/ping').set('X-Forwarded-For', '9.9.9.9');
      sharedLogs.clear();

      const response = await request(server)
        .get('/v1/fixtures/ping')
        .set('X-Forwarded-For', '9.9.9.9')
        .set('X-Request-Id', 'id-429');

      expect(response.status).toBe(429);
      const logged = sharedLogs.entries().filter((e) => requestIdOf(e) === 'id-429');
      expect(logged.length).toBeGreaterThan(0);
      expect(logged.some((e) => statusOf(e) === 429)).toBe(true);
    });
  });
});
