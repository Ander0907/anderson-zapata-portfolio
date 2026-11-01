import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../support/create-test-app.js';
import { FixtureModule } from '../support/fixtures.module.js';
import { sharedLogs } from '../support/log-collector.js';
import { problemOf } from '../support/problem.js';

describe('Malformed URIs keep their log correlation (A3, A5, ADR-013, ADR-014)', () => {
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

  it.each(['/v1/fixtures/p/%E0%A4%A', '/%E0%A4%A'])(
    'answers %s with a 400 problem whose traceId appears in a log entry with status 400',
    async (path) => {
      const response = await request(app.getHttpServer()).get(path);

      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
      const { traceId } = problemOf(response);
      expect(typeof traceId).toBe('string');
      const logged = sharedLogs
        .entries()
        .filter((entry) => (entry.req as { id?: string } | undefined)?.id === traceId);
      expect(logged.length).toBeGreaterThan(0);
      expect(
        logged.some((entry) => {
          const e = entry as { res?: { statusCode?: number }; status?: number };
          return (e.res?.statusCode ?? e.status) === 400;
        }),
      ).toBe(true);
    },
  );
});
