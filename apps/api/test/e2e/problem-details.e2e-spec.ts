import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { problemOf } from '../support/problem.js';
import { createTestApp } from '../support/create-test-app.js';
import { FixtureModule } from '../support/fixtures.module.js';
import { requestIdOf, sharedLogs } from '../support/log-collector.js';

const PROBLEM_JSON = /^application\/problem\+json/;

describe('Problem Details error responses (A5, ADR-013, ADR-014)', () => {
  let app: NestExpressApplication;
  const logs = sharedLogs;

  beforeEach(async () => {
    logs.clear();
    app = await createTestApp({ fixtures: [FixtureModule] });
  });

  afterEach(async () => {
    await app.close();
  });

  it('answers an unmatched route with a 404 NOT_FOUND problem', async () => {
    const response = await request(app.getHttpServer()).get('/v1/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(response.body).toMatchObject({ type: 'about:blank', status: 404, code: 'NOT_FOUND' });
    expect(typeof problemOf(response).title).toBe('string');
  });

  it('keeps the status of an HttpException and derives the code from it', async () => {
    const response = await request(app.getHttpServer()).get('/v1/fixtures/not-found');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(response.body).toMatchObject({ type: 'about:blank', status: 404, code: 'NOT_FOUND' });
  });

  it('uses the Nest errorCode when it is in the catalogue', async () => {
    const response = await request(app.getHttpServer()).get('/v1/fixtures/with-error-code');

    // The status alone would give BAD_REQUEST: the code can only come from errorCode.
    expect(response.status).toBe(400);
    expect(problemOf(response).code).toBe('VALIDATION_INVALID');
  });

  it('falls back to the status when the errorCode is not in the catalogue', async () => {
    const response = await request(app.getHttpServer()).get('/v1/fixtures/unknown-error-code');

    expect(response.status).toBe(409);
    expect(problemOf(response).code).toBe('CONFLICT');
    expect(response.text).not.toContain('NOT_IN_THE_CATALOGUE');
  });

  it('uses HTTP_ERROR as the last resort for a status without a mapped code', async () => {
    const response = await request(app.getHttpServer()).get('/v1/fixtures/teapot');

    expect(response.status).toBe(418);
    expect(problemOf(response).code).toBe('HTTP_ERROR');
  });

  it('puts the request id in traceId, equal to the X-Request-Id header', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/fixtures/not-found')
      .set('X-Request-Id', 'client-id-42');

    expect(problemOf(response).traceId).toBe('client-id-42');
    expect(response.headers['x-request-id']).toBe('client-id-42');
  });

  it('turns an unknown error into a generic 500 INTERNAL_ERROR problem', async () => {
    const response = await request(app.getHttpServer()).get('/v1/fixtures/boom');

    expect(response.status).toBe(500);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(response.body).toMatchObject({
      type: 'about:blank',
      status: 500,
      code: 'INTERNAL_ERROR',
    });
    expect(typeof problemOf(response).detail).toBe('string');
  });

  it('leaks neither the message nor the stack of an unknown error', async () => {
    const response = await request(app.getHttpServer()).get('/v1/fixtures/boom');

    expect(response.status).toBe(500);
    expect(response.text).not.toContain('internal-secret-detail');
    expect(response.text).not.toMatch(/\bat .*\.ts/);
    expect(response.body).not.toHaveProperty('stack');
  });

  it('never echoes exception text for a 5xx HttpException', async () => {
    const response = await request(app.getHttpServer()).get('/v1/fixtures/leaky-500');

    expect(response.status).toBe(500);
    expect(response.text).not.toContain('leaky-client-visible-text');
  });

  it('logs the stack of an unknown error at ERROR with the same request id', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/fixtures/boom')
      .set('X-Request-Id', 'client-id-42');

    expect(problemOf(response).traceId).toBe('client-id-42');
    const logged = logs
      .entries()
      .filter((entry) => entry.severity === 'ERROR' && requestIdOf(entry) === 'client-id-42');
    expect(logged.length).toBeGreaterThan(0);
    const stack = String((logged[0]?.err as { stack?: string } | undefined)?.stack);
    expect(stack).toContain('internal-secret-detail');
    expect(stack).toMatch(/at .*\.ts/);
  });

  it('answers malformed JSON with a 400 MALFORMED_JSON problem', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/fixtures/raw')
      .set('Content-Type', 'application/json')
      .send('{"broken": ');

    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toMatch(PROBLEM_JSON);
    expect(response.body).toMatchObject({
      type: 'about:blank',
      status: 400,
      code: 'MALFORMED_JSON',
    });
  });

  it('keeps traceId equal to X-Request-Id for malformed JSON', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/fixtures/raw')
      .set('Content-Type', 'application/json')
      .set('X-Request-Id', 'client-id-42')
      .send('{"broken": ');

    expect(response.status).toBe(400);
    expect(problemOf(response).traceId).toBe('client-id-42');
    expect(response.headers['x-request-id']).toBe('client-id-42');
  });

  it.each([
    ['bad-request', 400, 'BAD_REQUEST'],
    ['unauthorized', 401, 'UNAUTHORIZED'],
    ['forbidden', 403, 'FORBIDDEN'],
  ])('maps a %s HttpException without errorCode to %s', async (path, status, code) => {
    const response = await request(app.getHttpServer()).get(`/v1/fixtures/${path}`);

    expect(response.status).toBe(status);
    expect(problemOf(response).code).toBe(code);
  });
});
