import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../support/create-test-app.js';
import { FixtureModule } from '../support/fixtures.module.js';
import { type LogEntry, requestIdOf, sharedLogs } from '../support/log-collector.js';

const entriesOf = (id: string): LogEntry[] =>
  sharedLogs.entries().filter((entry) => requestIdOf(entry) === id);

describe('One completion entry per request (A3, ADR-014)', () => {
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

  // Guards `useExisting: true` in AppModule: without it nestjs-pino mounts a second pino-http and
  // a normal request would log twice.
  it('writes exactly one entry, the "request completed" line, for a normal request', async () => {
    await request(app.getHttpServer()).get('/health').set('X-Request-Id', 'unique-id-1');

    const entries = entriesOf('unique-id-1');
    expect(entries).toHaveLength(1);
    expect(entries[0]?.msg).toBe('request completed');
  });

  // Does not guard `useExisting`: the body parser rejects before the module middleware runs, so a
  // duplicate pino-http would not add a second WARNING here.

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
