import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../support/create-test-app.js';
import { FixtureModule } from '../support/fixtures.module.js';
import { type LogEntry, sharedLogs } from '../support/log-collector.js';

const MAX_URL_LENGTH = 2048;
const SECRET = 'secret-query-marker-552';

interface LoggedReq {
  id?: string;
  url?: string;
  urlTruncated?: boolean;
}
const reqOf = (entry: LogEntry | undefined): LoggedReq =>
  (entry?.req as LoggedReq | undefined) ?? {};
const entryOf = (id: string): LogEntry | undefined =>
  sharedLogs.entries().find((entry) => reqOf(entry).id === id);

describe('Logged URL is bounded (A3, ADR-014)', () => {
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

  it('cuts a long URL to exactly 2048 characters and flags it as truncated', async () => {
    await request(app.getHttpServer())
      .get(`/${'a'.repeat(5000)}`)
      .set('X-Request-Id', 'long-url-1');

    const req = reqOf(entryOf('long-url-1'));
    expect(req.url).toBe(`/${'a'.repeat(MAX_URL_LENGTH - 1)}`);
    expect(req.urlTruncated).toBe(true);
  });

  it('does not flag a path of exactly 2048 characters', async () => {
    const path = `/${'a'.repeat(MAX_URL_LENGTH - 1)}`;
    await request(app.getHttpServer()).get(path).set('X-Request-Id', 'edge-2048');

    const req = reqOf(entryOf('edge-2048'));
    expect(req.url).toBe(path);
    expect('urlTruncated' in req).toBe(false);
  });

  it('flags and cuts a path of 2049 characters', async () => {
    await request(app.getHttpServer())
      .get(`/${'a'.repeat(MAX_URL_LENGTH)}`)
      .set('X-Request-Id', 'edge-2049');

    const req = reqOf(entryOf('edge-2049'));
    expect(req.url).toBe(`/${'a'.repeat(MAX_URL_LENGTH - 1)}`);
    expect(req.urlTruncated).toBe(true);
  });

  it('strips the query first, so a path under the limit is not flagged because of its query', async () => {
    const path = `/${'c'.repeat(2039)}`;
    await request(app.getHttpServer())
      .get(`${path}?token=${SECRET}`)
      .set('X-Request-Id', 'long-url-2');

    const req = reqOf(entryOf('long-url-2'));
    expect(path.length + `?token=${SECRET}`.length).toBeGreaterThan(MAX_URL_LENGTH);
    expect(req.url).toBe(path);
    expect('urlTruncated' in req).toBe(false);
    expect(sharedLogs.raw()).not.toContain('?token');
    expect(sharedLogs.raw()).not.toContain(SECRET);
  });

  it('keeps a short path whole when only the query is long', async () => {
    await request(app.getHttpServer())
      .get(`/health?token=${'q'.repeat(5000)}`)
      .set('X-Request-Id', 'long-query-1');

    const req = reqOf(entryOf('long-query-1'));
    expect(req.url).toBe('/health');
    expect('urlTruncated' in req).toBe(false);
  });

  it('flags the truncation in the WARNING of a body-parser rejection on a long URL', async () => {
    const response = await request(app.getHttpServer())
      .post(`/${'d'.repeat(5000)}`)
      .set('Content-Type', 'application/json')
      .set('X-Request-Id', 'long-url-parser')
      .send('{"broken": ');

    expect(response.status).toBe(400);
    const warning = sharedLogs
      .entries()
      .find((entry) => entry.severity === 'WARNING' && reqOf(entry).id === 'long-url-parser');
    expect(reqOf(warning).url).toBe(`/${'d'.repeat(MAX_URL_LENGTH - 1)}`);
    expect(reqOf(warning).urlTruncated).toBe(true);
  });

  it('keeps a short URL whole and leaves out the truncation flag', async () => {
    await request(app.getHttpServer()).get('/health').set('X-Request-Id', 'short-url-1');

    const req = reqOf(entryOf('short-url-1'));
    expect(req.url).toBe('/health');
    expect('urlTruncated' in req).toBe(false);
  });
});
