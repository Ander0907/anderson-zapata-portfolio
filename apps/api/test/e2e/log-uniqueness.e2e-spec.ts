import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../support/create-test-app.js';
import { FixtureModule } from '../support/fixtures.module.js';
import { type LogEntry, sharedLogs } from '../support/log-collector.js';

const requestIdOf = (entry: LogEntry): unknown => (entry.req as { id?: unknown } | undefined)?.id;
const entriesOf = (id: string): LogEntry[] =>
  sharedLogs.entries().filter((entry) => requestIdOf(entry) === id);

// Guards `useExisting: true` in AppModule: without it nestjs-pino mounts a second pino-http.
describe('One log line per request (A3, ADR-014)', () => {
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

  it('writes exactly one "request completed" entry for a normal request', async () => {
    await request(app.getHttpServer()).get('/health').set('X-Request-Id', 'unique-id-1');

    const completed = entriesOf('unique-id-1').filter((e) => e.msg === 'request completed');
    expect(completed).toHaveLength(1);
  });

  it('writes exactly one WARNING for a request rejected by the body parser', async () => {
    await request(app.getHttpServer())
      .post('/v1/fixtures/raw')
      .set('Content-Type', 'application/json')
      .set('X-Request-Id', 'unique-id-2')
      .send('{"broken": ');

    const warnings = entriesOf('unique-id-2').filter((e) => e.severity === 'WARNING');
    expect(warnings).toHaveLength(1);
  });
});
