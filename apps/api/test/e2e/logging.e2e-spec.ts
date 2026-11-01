import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../support/create-test-app.js';
import { FixtureModule } from '../support/fixtures.module.js';
import { type LogEntry, sharedLogs } from '../support/log-collector.js';

const TRACE_ID = '0123456789abcdef0123456789abcdef';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const requestIdOf = (entry: LogEntry): unknown => (entry.req as { id?: unknown } | undefined)?.id;
const TRACE_FIELD = 'logging.googleapis.com/trace';

describe('Structured logging and request id (A3, ADR-014, D13)', () => {
  let app: NestExpressApplication | undefined;
  const logs = sharedLogs;

  const start = async (env: Record<string, string> = {}) => {
    logs.clear();
    app = await createTestApp({ fixtures: [FixtureModule], env });
    return app.getHttpServer();
  };

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  describe('request id', () => {
    it('uses the first 32 hex characters of X-Cloud-Trace-Context', async () => {
      const server = await start();

      const response = await request(server)
        .get('/health')
        .set('X-Cloud-Trace-Context', `${TRACE_ID}/1234;o=1`);

      expect(response.headers['x-request-id']).toBe(TRACE_ID);
    });

    it('prefers the trace header over X-Request-Id', async () => {
      const server = await start();

      const response = await request(server)
        .get('/health')
        .set('X-Cloud-Trace-Context', `${TRACE_ID}/1`)
        .set('X-Request-Id', 'client-id-42');

      expect(response.headers['x-request-id']).toBe(TRACE_ID);
    });

    it('echoes a well-formed X-Request-Id when there is no trace header', async () => {
      const server = await start();

      const response = await request(server).get('/health').set('X-Request-Id', 'client-id-42');

      expect(response.headers['x-request-id']).toBe('client-id-42');
    });

    it('ignores a trace header that does not start with 32 hex characters', async () => {
      const server = await start();

      const response = await request(server)
        .get('/health')
        .set('X-Cloud-Trace-Context', 'not-a-trace/1')
        .set('X-Request-Id', 'client-id-42');

      expect(response.headers['x-request-id']).toBe('client-id-42');
    });

    it.each([
      ['spaces and symbols', 'bad id; drop table'],
      ['more than 64 characters', 'a'.repeat(65)],
    ])('replaces an X-Request-Id with %s by a generated UUID', async (_label, value) => {
      const server = await start();

      const response = await request(server).get('/health').set('X-Request-Id', value);

      expect(response.headers['x-request-id']).toMatch(UUID);
    });

    it('generates a UUID when no id is supplied', async () => {
      const server = await start();

      const response = await request(server).get('/health');

      expect(response.headers['x-request-id']).toMatch(UUID);
    });

    it('writes the request id into req.id of the log entries of that request', async () => {
      const server = await start();

      await request(server).get('/health').set('X-Request-Id', 'client-id-42');

      expect(logs.entries().some((entry) => requestIdOf(entry) === 'client-id-42')).toBe(true);
    });

    it('writes a generated request id into req.id as well', async () => {
      const server = await start();

      const response = await request(server).get('/health');

      const id = response.headers['x-request-id'];
      expect(id).toMatch(UUID);
      expect(logs.entries().some((entry) => requestIdOf(entry) === id)).toBe(true);
    });
  });

  describe('log format', () => {
    it('emits JSON entries with an uppercase severity field', async () => {
      const server = await start();

      await request(server).get('/health');

      const entries = logs.entries();
      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) {
        expect(entry.severity).toMatch(/^[A-Z]+$/);
      }
    });

    it('omits the trace field when there is no project id', async () => {
      const server = await start();

      await request(server).get('/health').set('X-Cloud-Trace-Context', `${TRACE_ID}/1`);

      const entries = logs.entries();
      expect(entries.length).toBeGreaterThan(0);
      expect(entries.some((entry) => TRACE_FIELD in entry)).toBe(false);
    });

    it('routes Nest framework logs through pino', async () => {
      await start();

      expect(logs.entries().some((entry) => entry.context === 'RoutesResolver')).toBe(true);
    });
  });

  describe('redaction and privacy', () => {
    it('redacts authorization and cookie request headers', async () => {
      const server = await start();

      await request(server)
        .get('/health')
        .set('Authorization', 'Bearer token-secret-xyz')
        .set('Cookie', 'session=cookie-secret-abc');

      expect(logs.entries().length).toBeGreaterThan(0);
      expect(logs.raw()).not.toContain('token-secret-xyz');
      expect(logs.raw()).not.toContain('cookie-secret-abc');
    });

    it('redacts the set-cookie response header', async () => {
      const server = await start();

      await request(server).get('/v1/fixtures/set-cookie').expect(200);

      expect(logs.entries().length).toBeGreaterThan(0);
      expect(logs.raw()).not.toContain('response-cookie-secret');
    });

    it('redacts the personal fields name, email and message', async () => {
      const server = await start();

      await request(server).get('/v1/fixtures/log-personal').expect(200);

      expect(logs.entries().some((entry) => entry.marker === 'personal-log-marker')).toBe(true);
      expect(logs.raw()).not.toContain('Ana Personal');
      expect(logs.raw()).not.toContain('ana@personal.example');
      expect(logs.raw()).not.toContain('private-message-text');
    });

    it('never logs request bodies', async () => {
      const server = await start();

      await request(server)
        .post('/v1/fixtures/raw')
        .send({ note: 'body-marker-98765' })
        .expect(201);

      expect(logs.entries().length).toBeGreaterThan(0);
      expect(logs.raw()).not.toContain('body-marker-98765');
    });
  });
});
