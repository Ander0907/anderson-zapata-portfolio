import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestAppOptions } from '../support/create-test-app.js';
import { FixtureModule } from '../support/fixtures.module.js';
import { problemOf } from '../support/problem.js';

const PROBLEM_JSON = /^application\/problem\+json/;

type Server = ReturnType<NestExpressApplication['getHttpServer']>;

const accessControlHeaders = (headers: Record<string, unknown>): string[] =>
  Object.keys(headers).filter((name) => name.startsWith('access-control-'));

describe('Edge protection (B1 to B4, ADR-008, ADR-011, manual 7.5, D5)', () => {
  let app: NestExpressApplication | undefined;

  const start = async (options: TestAppOptions = {}): Promise<Server> => {
    app = await createTestApp({ fixtures: [FixtureModule], ...options });
    return app.getHttpServer();
  };

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  describe('security headers (B1)', () => {
    it('sends helmet defaults', async () => {
      const response = await request(await start()).get('/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });

    it('does not advertise the framework', async () => {
      const response = await request(await start()).get('/health');

      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('CORS with no allowed origins, same-origin model (B2)', () => {
    // Pass at once: CORS is simply not enabled today. They guard against enabling it by default.
    it('sends no Access-Control header on a simple request', async () => {
      const response = await request(await start())
        .get('/health')
        .set('Origin', 'https://other.example');

      expect(accessControlHeaders(response.headers)).toEqual([]);
    });

    it('sends no Access-Control header on a preflight', async () => {
      const response = await request(await start())
        .options('/v1/fixtures/raw')
        .set('Origin', 'https://other.example')
        .set('Access-Control-Request-Method', 'POST');

      expect(accessControlHeaders(response.headers)).toEqual([]);
    });
  });

  describe('CORS with a list of allowed origins, plan B (B2)', () => {
    const env = { CORS_ALLOWED_ORIGINS: 'https://app.example,https://admin.example' };

    it('allows a listed origin with credentials on a simple request', async () => {
      const response = await request(await start({ env }))
        .get('/health')
        .set('Origin', 'https://admin.example');

      expect(response.headers['access-control-allow-origin']).toBe('https://admin.example');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('answers the preflight of a listed origin with limited methods', async () => {
      const response = await request(await start({ env }))
        .options('/v1/fixtures/raw')
        .set('Origin', 'https://app.example')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('https://app.example');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
      const methods = String(response.headers['access-control-allow-methods']);
      expect(methods).toContain('POST');
      expect(methods).not.toContain('DELETE');
    });

    it.each(['https://evil.example', 'https://app.example.evil.example', 'http://app.example'])(
      'sends no allow header to the unlisted origin %s on a simple request',
      async (origin) => {
        const response = await request(await start({ env }))
          .get('/health')
          .set('Origin', origin);

        expect(response.headers['access-control-allow-origin']).toBeUndefined();
      },
    );

    it('sends no allow header to an unlisted origin on a preflight', async () => {
      const response = await request(await start({ env }))
        .options('/v1/fixtures/raw')
        .set('Origin', 'https://evil.example')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('JSON body limit and parsers (B3, D5)', () => {
    const postJson = (server: Server, body: string) =>
      request(server).post('/v1/fixtures/raw').set('Content-Type', 'application/json').send(body);

    it('accepts a JSON body under 16 kB', async () => {
      const response = await postJson(await start(), JSON.stringify({ pad: 'a'.repeat(15_000) }));

      expect(response.status).toBe(201);
    });

    it('rejects a JSON body over 16 kB with 413 PAYLOAD_TOO_LARGE', async () => {
      const response = await postJson(await start(), JSON.stringify({ pad: 'a'.repeat(17_000) }));

      expect(response.status).toBe(413);
      expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(response.body).toMatchObject({
        type: 'about:blank',
        status: 413,
        code: 'PAYLOAD_TOO_LARGE',
      });
    });

    it('gives the 413 a traceId equal to X-Request-Id', async () => {
      const response = await request(await start())
        .post('/v1/fixtures/raw')
        .set('Content-Type', 'application/json')
        .set('X-Request-Id', 'client-id-42')
        .send(JSON.stringify({ pad: 'a'.repeat(17_000) }));

      expect(response.status).toBe(413);
      expect(problemOf(response).traceId).toBe('client-id-42');
      expect(response.headers['x-request-id']).toBe('client-id-42');
    });

    // Choice: body-parser reports these as 415; the status map has no entry, so HTTP_ERROR.
    it('answers an unsupported charset with a 415 problem, never a 500', async () => {
      const response = await request(await start())
        .post('/v1/fixtures/raw')
        .set('Content-Type', 'application/json; charset=iso-8859-1')
        .send('{"a":1}');

      expect(response.status).toBe(415);
      expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(response.body).toMatchObject({ status: 415, code: 'HTTP_ERROR' });
      expect(typeof problemOf(response).traceId).toBe('string');
    });

    it('answers an unsupported content encoding with a 415 problem, never a 500', async () => {
      const response = await request(await start())
        .post('/v1/fixtures/raw')
        .set('Content-Type', 'application/json')
        .set('Content-Encoding', 'unknown-encoding')
        .send('{"a":1}');

      expect(response.status).toBe(415);
      expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(response.body).toMatchObject({ status: 415, code: 'HTTP_ERROR' });
    });

    // Passes at once: only the JSON parser is registered. Guards against adding others.
    it('does not parse form-urlencoded bodies', async () => {
      const response = await request(await start())
        .post('/v1/fixtures/raw')
        .type('form')
        .send('secret=form-value');

      expect(JSON.stringify(response.body)).not.toContain('form-value');
    });
  });

  describe('rate limiting by client IP (B4, ADR-008)', () => {
    const limited = { RATE_LIMIT_MAX: '2', RATE_LIMIT_TTL_SECONDS: '60' };
    const ping = (server: Server, forwardedFor: string) =>
      request(server).get('/v1/fixtures/ping').set('X-Forwarded-For', forwardedFor);

    it('allows requests up to the limit', async () => {
      const server = await start({ env: limited });

      await ping(server, '9.9.9.9').expect(200);
      await ping(server, '9.9.9.9').expect(200);
    });

    it('answers the request over the limit with a 429 RATE_LIMITED problem', async () => {
      const server = await start({ env: limited });
      await ping(server, '9.9.9.9');
      await ping(server, '9.9.9.9');

      const response = await ping(server, '9.9.9.9').set('X-Request-Id', 'client-id-42');

      expect(response.status).toBe(429);
      expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
      expect(response.body).toMatchObject({
        type: 'about:blank',
        status: 429,
        code: 'RATE_LIMITED',
        traceId: 'client-id-42',
      });
    });

    it('sends Retry-After as a positive integer of seconds', async () => {
      const server = await start({ env: limited });
      await ping(server, '9.9.9.9');
      await ping(server, '9.9.9.9');

      const response = await ping(server, '9.9.9.9');

      const retryAfter = String(response.headers['retry-after']);
      expect(retryAfter).toMatch(/^[1-9]\d*$/);
      expect(Number(retryAfter)).toBeLessThanOrEqual(60);
    });

    it('throttles /health too', async () => {
      const server = await start({ env: { RATE_LIMIT_MAX: '1', RATE_LIMIT_TTL_SECONDS: '60' } });

      await request(server).get('/health').set('X-Forwarded-For', '9.9.9.9').expect(200);
      await request(server).get('/health').set('X-Forwarded-For', '9.9.9.9').expect(429);
    });

    it('shares one counter between requests that only vary the spoofable leftmost entry', async () => {
      const server = await start({ env: limited });

      await ping(server, '1.1.1.1, 9.9.9.9').expect(200);
      await ping(server, '2.2.2.2, 9.9.9.9').expect(200);
      await ping(server, '3.3.3.3, 9.9.9.9').expect(429);
    });

    it('gives a different rightmost entry its own counter', async () => {
      const server = await start({ env: limited });
      await ping(server, '1.1.1.1, 9.9.9.9');
      await ping(server, '1.1.1.1, 9.9.9.9');
      await ping(server, '1.1.1.1, 9.9.9.9').expect(429);

      await ping(server, '1.1.1.1, 8.8.8.8').expect(200);
    });
  });
});
