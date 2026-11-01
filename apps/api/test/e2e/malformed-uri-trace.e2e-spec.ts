import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../support/create-test-app.js';
import { FixtureModule } from '../support/fixtures.module.js';
import { sharedLogs } from '../support/log-collector.js';

const TRACE_ID = '0123456789abcdef0123456789abcdef';
const TRACE_FIELD = 'logging.googleapis.com/trace';

describe('Malformed URIs keep the Cloud Logging trace field (A3, ADR-014, D13)', () => {
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

  it.each(['/v1/fixtures/p/%E0%A4%A', '/%E0%A4%A'])(
    'carries the trace field in the log entry for %s',
    async (path) => {
      const response = await request(app.getHttpServer())
        .get(path)
        .set('X-Cloud-Trace-Context', `${TRACE_ID}/1`);

      expect(response.status).toBe(400);
      expect(
        sharedLogs
          .entries()
          .some((entry) => entry[TRACE_FIELD] === `projects/my-project/traces/${TRACE_ID}`),
      ).toBe(true);
    },
  );
});
