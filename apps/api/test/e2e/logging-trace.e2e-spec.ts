import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../support/create-test-app.js';
import { FixtureModule } from '../support/fixtures.module.js';
import { sharedLogs } from '../support/log-collector.js';

const TRACE_ID = '0123456789abcdef0123456789abcdef';
const TRACE_FIELD = 'logging.googleapis.com/trace';

// Separate file from logging.e2e-spec.ts for its own env: `customProps` (here GCP_PROJECT_ID) is
// built on each forRoot. Only nestjs-pino's root logger stays global to the module registry.
describe('Cloud Logging trace correlation with GCP_PROJECT_ID set (A3, ADR-014, D13)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp({ fixtures: [FixtureModule], env: { GCP_PROJECT_ID: 'my-project' } });
  });

  beforeEach(() => {
    sharedLogs.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs the trace field with project and trace header', async () => {
    await request(app.getHttpServer()).get('/health').set('X-Cloud-Trace-Context', `${TRACE_ID}/1`);

    expect(
      sharedLogs
        .entries()
        .some((entry) => entry[TRACE_FIELD] === `projects/my-project/traces/${TRACE_ID}`),
    ).toBe(true);
  });

  it('omits the trace field when there is a project id but no trace header', async () => {
    await request(app.getHttpServer()).get('/health');

    const entries = sharedLogs.entries();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.some((entry) => TRACE_FIELD in entry)).toBe(false);
  });

  describe('requests rejected by the body parser', () => {
    const tracedWarning = () => sharedLogs.entries().find((entry) => entry.severity === 'WARNING');

    it.each([
      ['malformed JSON', () => '{"broken": '],
      ['a body over the limit', () => JSON.stringify({ pad: 'a'.repeat(17_000) })],
    ])('carries the trace field in the WARNING for %s', async (_name, body) => {
      await request(app.getHttpServer())
        .post('/v1/fixtures/raw')
        .set('Content-Type', 'application/json')
        .set('X-Cloud-Trace-Context', `${TRACE_ID}/1`)
        .send(body());

      expect(tracedWarning()?.[TRACE_FIELD]).toBe(`projects/my-project/traces/${TRACE_ID}`);
    });
  });
});
