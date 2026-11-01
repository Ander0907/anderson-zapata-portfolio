import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../support/create-test-app.js';
import { FixtureModule } from '../support/fixtures.module.js';
import { sharedLogs } from '../support/log-collector.js';

const TRACE_ID = '0123456789abcdef0123456789abcdef';
const TRACE_FIELD = 'logging.googleapis.com/trace';

// Separate file from logging.e2e-spec.ts: nestjs-pino fixes its configuration (here
// GCP_PROJECT_ID) for the whole module registry, which Vitest isolates per spec file.
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
});
