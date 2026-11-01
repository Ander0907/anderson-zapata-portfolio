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

  it('cuts a long URL to at most 2048 characters and flags it as truncated', async () => {
    await request(app.getHttpServer())
      .get(`/${'a'.repeat(5000)}`)
      .set('X-Request-Id', 'long-url-1');

    const req = reqOf(entryOf('long-url-1'));
    expect(req.url).toBeDefined();
    expect(req.url?.length).toBeLessThanOrEqual(MAX_URL_LENGTH);
    expect(req.urlTruncated).toBe(true);
  });

  it('strips the query before cutting, so a truncated URL never carries it', async () => {
    await request(app.getHttpServer())
      .get(`/${'b'.repeat(5000)}?token=${SECRET}`)
      .set('X-Request-Id', 'long-url-2');

    expect(reqOf(entryOf('long-url-2')).urlTruncated).toBe(true);
    expect(sharedLogs.raw()).not.toContain(SECRET);
  });

  it('keeps a short URL whole and leaves out the truncation flag', async () => {
    await request(app.getHttpServer()).get('/health').set('X-Request-Id', 'short-url-1');

    const req = reqOf(entryOf('short-url-1'));
    expect(req.url).toBe('/health');
    expect('urlTruncated' in req).toBe(false);
  });
});
