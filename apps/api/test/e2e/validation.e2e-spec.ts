import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { problemOf } from '../support/problem.js';
import { createTestApp } from '../support/create-test-app.js';
import { FixtureModule } from '../support/fixtures.module.js';

describe('Schema validation with Problem Details (A6, ADR-009, ADR-013)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp({ fixtures: [FixtureModule] });
  });

  afterAll(async () => {
    await app.close();
  });

  const post = (path: string, body: unknown) =>
    request(app.getHttpServer())
      .post(path)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(body));
  const postItem = (body: unknown) => post('/v1/fixtures/items', body);

  it('accepts valid input and hands the parsed value to the handler', async () => {
    const response = await postItem({ name: 'Ana', email: 'ana@example.com' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ created: { name: 'Ana', email: 'ana@example.com' } });
  });

  it('answers well-formed but invalid input with 422 VALIDATION_FAILED', async () => {
    const response = await postItem({ name: 'Ana', email: 'not-an-email' });

    expect(response.status).toBe(422);
    expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(response.body).toMatchObject({
      type: 'about:blank',
      status: 422,
      code: 'VALIDATION_FAILED',
    });
    expect(typeof problemOf(response).traceId).toBe('string');
  });

  it('reports a fixture-registered code with the JSON Pointer of the field', async () => {
    const response = await postItem({ name: '', email: 'ana@example.com' });

    expect(response.status).toBe(422);
    expect(problemOf(response).errors).toEqual([{ pointer: '/name', code: 'NAME_REQUIRED' }]);
  });

  it('maps raw zod messages to VALIDATION_INVALID so English text never leaks', async () => {
    const response = await postItem({ name: 'Ana', email: 'not-an-email' });

    expect(problemOf(response).errors).toEqual([{ pointer: '/email', code: 'VALIDATION_INVALID' }]);
    expect(response.text).not.toMatch(/Invalid email/i);
  });

  it('reports every issue, not only the first', async () => {
    const response = await postItem({ name: 'far too long', email: 'nope' });

    expect(problemOf(response).errors).toHaveLength(2);
    expect(problemOf(response).errors).toEqual(
      expect.arrayContaining([
        { pointer: '/name', code: 'NAME_TOO_LONG' },
        { pointer: '/email', code: 'VALIDATION_INVALID' },
      ]),
    );
  });

  it('builds a nested pointer with the array index', async () => {
    const response = await postItem({ name: 'Ana', email: 'ana@example.com', tags: ['ok', 7] });

    expect(problemOf(response).errors).toEqual([
      { pointer: '/tags/1', code: 'VALIDATION_INVALID' },
    ]);
  });

  it('escapes / and ~ in pointer segments per RFC 6901', async () => {
    const response = await postItem({ name: 'Ana', email: 'ana@example.com', 'a/b~c': 5 });

    expect(problemOf(response).errors).toEqual([
      { pointer: '/a~1b~0c', code: 'VALIDATION_INVALID' },
    ]);
  });

  it('uses the empty pointer for an issue on the root', async () => {
    const response = await postItem([]);

    expect(response.status).toBe(422);
    expect(problemOf(response).errors).toEqual([{ pointer: '', code: 'VALIDATION_INVALID' }]);
  });

  it('rejects unknown keys of a strict object with 422', async () => {
    const response = await postItem({ name: 'Ana', email: 'ana@example.com', extra: 'unexpected' });

    expect(response.status).toBe(422);
    expect(problemOf(response).code).toBe('VALIDATION_FAILED');
    expect(response.text).not.toContain('Unrecognized');
  });

  it('leaves handlers without a schema untouched', async () => {
    const response = await post('/v1/fixtures/raw', { anything: 'goes', extra: [1, 2] });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ received: { anything: 'goes', extra: [1, 2] } });
  });
});
