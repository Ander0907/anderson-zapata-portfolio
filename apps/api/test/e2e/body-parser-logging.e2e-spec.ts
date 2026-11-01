import { gzipSync } from 'node:zlib';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../support/create-test-app.js';
import { FixtureModule } from '../support/fixtures.module.js';
import { type LogEntry, sharedLogs } from '../support/log-collector.js';
import { problemOf } from '../support/problem.js';

const BODY_MARKER = 'raw-body-marker-777';

const scenarios = [
  {
    name: 'malformed JSON',
    status: 400,
    errorText: /unexpected|JSON at position|expected/i,
    send: (id: string) =>
      request(app.getHttpServer())
        .post('/v1/fixtures/raw')
        .set('Content-Type', 'application/json')
        .set('X-Request-Id', id)
        .send(`{"note": "${BODY_MARKER}", `),
  },
  {
    name: 'a body over the limit',
    status: 413,
    errorText: /request entity too large/i,
    send: (id: string) =>
      request(app.getHttpServer())
        .post('/v1/fixtures/raw')
        .set('Content-Type', 'application/json')
        .set('X-Request-Id', id)
        .send(JSON.stringify({ note: BODY_MARKER, pad: 'a'.repeat(17_000) })),
  },
  {
    name: 'a corrupt gzip body',
    status: 400,
    errorText: /incorrect header check/i,
    send: (id: string) =>
      request(app.getHttpServer())
        .post('/v1/fixtures/raw')
        .set('Content-Type', 'application/json')
        .set('Content-Encoding', 'gzip')
        .set('X-Request-Id', id)
        .send(Buffer.concat([Buffer.from(BODY_MARKER), gzipSync('{}')])),
  },
];

let app: NestExpressApplication;

describe('Logging of requests rejected by the body parser (A3, B3, ADR-014)', () => {
  beforeAll(async () => {
    app = await createTestApp({ fixtures: [FixtureModule] });
  });

  beforeEach(() => {
    sharedLogs.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  const warningOf = (id: string): LogEntry | undefined =>
    sharedLogs
      .entries()
      .find((entry) => entry.severity === 'WARNING' && (entry.req as { id?: string })?.id === id);

  describe.each(scenarios)('$name', ({ status, errorText, send }) => {
    it('logs a WARNING with the traceId, the method and the status', async () => {
      const response = await send('client-id-42');

      expect(response.status).toBe(status);
      expect(problemOf(response).traceId).toBe('client-id-42');
      const entry = warningOf('client-id-42');
      expect(entry).toBeDefined();
      expect(entry?.req).toMatchObject({ method: 'POST' });
      const logged = entry as {
        res?: { statusCode?: number };
        status?: number;
        statusCode?: number;
      };
      expect(logged.res?.statusCode ?? logged.status ?? logged.statusCode).toBe(status);
    });

    it('logs neither the raw body nor the original error text', async () => {
      await send('client-id-43');

      expect(warningOf('client-id-43')).toBeDefined();
      expect(sharedLogs.raw()).not.toContain(BODY_MARKER);
      expect(sharedLogs.raw()).not.toMatch(errorText);
    });
  });
});
