import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from '../support/create-test-app.js';
import { FixtureModule } from '../support/fixtures.module.js';

describe('Health and routing (A2, ADR-016, D6)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp({ fixtures: [FixtureModule] });
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 200 {status: ok} on the unversioned /health', async () => {
    const response = await request(app.getHttpServer()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('does not expose the health check under a version prefix', async () => {
    await request(app.getHttpServer()).get('/v1/health').expect(404);
  });

  it('does not use a global /api prefix', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(404);
  });

  it('serves regular routes under /v1 by default', async () => {
    const response = await request(app.getHttpServer()).get('/v1/fixtures/ping');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ pong: true });
  });

  it('does not serve regular routes without the version prefix', async () => {
    await request(app.getHttpServer()).get('/fixtures/ping').expect(404);
  });
});
