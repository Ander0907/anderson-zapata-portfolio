import { Injectable, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp, NEST_APP_OPTIONS } from '../../src/app.setup.js';
import { parseEnv } from '../../src/config/env.js';
import { createTestApp } from '../support/create-test-app.js';
import { ConfigProbeModule } from '../support/config-probe.module.js';
import { sharedLogs } from '../support/log-collector.js';
import { problemOf } from '../support/problem.js';

@Injectable()
class FailingAtBoot {
  constructor() {
    throw new Error('boot-failure-marker');
  }
}

@Module({ providers: [FailingAtBoot] })
class FailingModule {}

describe('Real boot path through NestFactory (B5, B6, ADR-014)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    sharedLogs.clear();
    app = await createApp(parseEnv({ NODE_ENV: 'test', PORT: '9090' }), {
      logDestination: sharedLogs.destination,
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('serves /health with the wiring of configureApp', async () => {
    const response = await request(app.getHttpServer()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('rejects a 17 kB JSON body with a 413 problem', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/anything')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ pad: 'a'.repeat(17_000) }));

    expect(response.status).toBe(413);
    expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(problemOf(response).code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('sends the startup logs through pino as JSON (bufferLogs)', () => {
    const startup = sharedLogs.entries().filter((entry) => entry.context === 'InstanceLoader');

    expect(startup.length).toBeGreaterThan(0);
    expect(startup.every((entry) => /^[A-Z]+$/.test(String(entry.severity)))).toBe(true);
  });

  it('rejects the promise on a boot failure instead of aborting the process', async () => {
    const abort = vi.spyOn(process, 'abort').mockImplementation((() => undefined) as never);

    await expect(
      NestFactory.create(FailingModule, { ...NEST_APP_OPTIONS, logger: false }),
    ).rejects.toThrow('boot-failure-marker');
    expect(abort).not.toHaveBeenCalled();
  });
});

describe('ConfigService with the validated env (A1, ADR-009)', () => {
  it('hands fixture providers the parsed values, not raw strings', async () => {
    const app = await createTestApp({
      fixtures: [ConfigProbeModule],
      env: { PORT: '9090' },
    });

    try {
      const response = await request(app.getHttpServer()).get('/v1/fixtures/config');

      expect(response.body).toEqual({
        port: 9090,
        portType: 'number',
        nodeEnv: 'test',
        corsOrigins: [],
      });
    } finally {
      await app.close();
    }
  });
});
