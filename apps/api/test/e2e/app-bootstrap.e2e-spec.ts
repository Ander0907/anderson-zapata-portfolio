import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { AppModule } from '../../src/app.module.js';

describe('Application bootstrap (manual section 12, row 0)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 404 for a route that does not exist', async () => {
    await request(app.getHttpServer()).get('/this-route-does-not-exist').expect(404);
  });
});
