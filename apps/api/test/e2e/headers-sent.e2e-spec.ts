import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../support/create-test-app.js';
import { FixtureModule } from '../support/fixtures.module.js';
import { sharedLogs } from '../support/log-collector.js';

describe('Errors after the response started (A5, ADR-013, ADR-014)', () => {
  let app: NestExpressApplication;
  const uncaught: unknown[] = [];
  const collect = (error: unknown) => uncaught.push(error);

  beforeAll(async () => {
    app = await createTestApp({ fixtures: [FixtureModule] });
  });

  beforeEach(() => {
    sharedLogs.clear();
    uncaught.length = 0;
    process.on('uncaughtException', collect);
    process.on('unhandledRejection', collect);
  });

  afterEach(() => {
    process.off('uncaughtException', collect);
    process.off('unhandledRejection', collect);
  });

  afterAll(async () => {
    await app.close();
  });

  it('ends the response cleanly without a second write or an uncaught error', async () => {
    const response = await request(app.getHttpServer()).get('/v1/fixtures/write-then-throw');
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(response.text).toContain('partial-body');
    expect(response.text).not.toContain('after-write-secret');
    expect(uncaught).toEqual([]);
  });

  it('logs the exception exactly once, with no second ERROR entry', async () => {
    await request(app.getHttpServer())
      .get('/v1/fixtures/write-then-throw')
      .catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const errors = sharedLogs.entries().filter((entry) => entry.severity === 'ERROR');
    expect(errors).toHaveLength(1);
    expect(JSON.stringify(errors[0])).toContain('after-write-secret');
  });
});
