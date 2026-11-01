import { createHash } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../support/create-test-app.js';
import { problemOf } from '../support/problem.js';

const directives = (csp: unknown): Map<string, string[]> =>
  new Map(
    (typeof csp === 'string' ? csp : '')
      .split(';')
      .map((part) => part.trim().split(/\s+/))
      .filter((parts) => parts[0] !== '' && parts[0] !== undefined)
      .map(([name, ...values]) => [name as string, values]),
  );

describe('Swagger UI under the helmet CSP (C4, D16)', () => {
  let app: NestExpressApplication | undefined;

  const start = async (nodeEnv: string) => {
    app = await createTestApp({ env: { NODE_ENV: nodeEnv } });
    return app.getHttpServer();
  };

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  describe.each(['development', 'test'])('outside production (NODE_ENV=%s)', (nodeEnv) => {
    it('serves /docs as HTML', async () => {
      const response = await request(await start(nodeEnv)).get('/docs');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/^text\/html/);
    });

    it('serves /docs-json as the OpenAPI document', async () => {
      const response = await request(await start(nodeEnv)).get('/docs-json');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/json/);
      expect(Object.keys((response.body as { paths: object }).paths)).toContain('/health');
    });
  });

  it('lets the CSP of /docs allow its inline bootstrap, styles and own assets', async () => {
    const server = await start('development');
    const page = await request(server).get('/docs');
    expect(page.status).toBe(200);
    const csp = directives(page.headers['content-security-policy']);
    const scriptSrc = csp.get('script-src') ?? csp.get('default-src') ?? [];
    const html = page.text;

    const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
      (m) => m[1] ?? '',
    );
    for (const body of inline.filter((b) => b.trim() !== '')) {
      const hash = `'sha256-${createHash('sha256').update(body).digest('base64')}'`;
      expect(
        scriptSrc.includes("'unsafe-inline'") || scriptSrc.includes(hash),
        `inline script not allowed by CSP: ${scriptSrc.join(' ')}`,
      ).toBe(true);
    }
    expect(scriptSrc.includes("'self'") || scriptSrc.includes('*')).toBe(true);
    expect(csp.get('style-src') ?? []).toContain("'unsafe-inline'");
    expect(csp.get('img-src') ?? []).toContain('data:');

    const assets = [...html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css|png))"/g)].map((m) => m[1]);
    expect(assets.length).toBeGreaterThan(0);
    for (const asset of assets) {
      // Resolve against the page URL as a browser does.
      const { pathname } = new URL(asset ?? '', 'http://localhost/docs');
      await request(server).get(pathname).expect(200);
    }
  });

  it('keeps the strict helmet CSP on non-docs routes', async () => {
    const response = await request(await start('development')).get('/health');
    const csp = directives(response.headers['content-security-policy']);

    expect(csp.get('default-src')).toEqual(["'self'"]);
    expect(csp.get('script-src') ?? []).not.toContain("'unsafe-inline'");
  });

  describe('in production', () => {
    // Guard: Swagger UI must stay unmounted in production, where these are plain 404 problems.
    it.each(['/docs', '/docs-json'])('answers %s with a 404 problem', async (path) => {
      const response = await request(await start('production')).get(path);

      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
      expect(problemOf(response).code).toBe('NOT_FOUND');
    });

    it('does not relax the CSP anywhere', async () => {
      const server = await start('production');

      for (const path of ['/health', '/docs']) {
        const csp = directives(
          (await request(server).get(path)).headers['content-security-policy'],
        );
        expect(csp.get('default-src')).toEqual(["'self'"]);
        expect(csp.get('script-src') ?? []).not.toContain("'unsafe-inline'");
      }
    });
  });
});
