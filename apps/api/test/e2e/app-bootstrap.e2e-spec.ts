import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { createTestApp } from '../support/create-test-app.js';

describe('Application bootstrap (manual section 12, row 0)', () => {
  let app: NestExpressApplication | undefined;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('answers 404 for a route that does not exist', async () => {
    if (!app) throw new Error('The application was not bootstrapped');
    await request(app.getHttpServer()).get('/this-route-does-not-exist').expect(404);
  });
});
