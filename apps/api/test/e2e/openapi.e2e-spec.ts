import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { buildOpenApiDocument } from '../../src/openapi/openapi.js';
import { createTestApp } from '../support/create-test-app.js';
import { OpenApiFixtureModule } from '../support/openapi-fixture.module.js';

type Node = Record<string, unknown>;

const asNode = (value: unknown): Node => (value ?? {}) as Node;

describe('OpenAPI document (C1 to C3, ADR-009, D10)', () => {
  let app: NestExpressApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  describe('request body schema from a Standard Schema (C2, ADR-009)', () => {
    const resolve = (document: Node, node: unknown): Node => {
      const current = asNode(node);
      const ref = current['$ref'];
      if (typeof ref !== 'string') return current;
      const target = ref
        .replace(/^#\//, '')
        .split('/')
        .reduce<unknown>((acc, key) => asNode(acc)[key], document);
      return resolve(document, target);
    };

    const bodySchema = async () => {
      app = await createTestApp({ fixtures: [OpenApiFixtureModule] });
      const document = buildOpenApiDocument(app) as unknown as Node;
      const operation = asNode(
        asNode(asNode(document['paths'])['/v1/fixtures/openapi-items'])['post'],
      );
      const content = asNode(asNode(operation['requestBody'])['content']);
      const schema = resolve(document, asNode(content['application/json'])['schema']);
      return { document, schema };
    };

    it('documents the fixture route with a JSON request body', async () => {
      const { schema } = await bodySchema();

      expect(schema['type']).toBe('object');
    });

    it('lists the properties and the required fields of the schema', async () => {
      const { schema } = await bodySchema();

      expect(Object.keys(asNode(schema['properties'])).sort()).toEqual(['note', 'tags', 'title']);
      expect([...(schema['required'] as string[])].sort()).toEqual(['tags', 'title']);
    });

    it('forbids additional properties for a strict object', async () => {
      const { schema } = await bodySchema();

      expect(schema['additionalProperties']).toBe(false);
    });

    it('keeps the maxLength of bounded strings', async () => {
      const { document, schema } = await bodySchema();
      const properties = asNode(schema['properties']);

      expect(resolve(document, properties['title'])['maxLength']).toBe(50);
      expect(resolve(document, properties['note'])['maxLength']).toBe(200);
    });

    it('keeps the maxItems and the item schema of a nested array', async () => {
      const { document, schema } = await bodySchema();
      const tags = resolve(document, asNode(schema['properties'])['tags']);
      const item = resolve(document, tags['items']);

      expect(tags['maxItems']).toBe(5);
      expect(resolve(document, asNode(item['properties'])['label'])['maxLength']).toBe(20);
      expect(item['additionalProperties']).toBe(false);
    });
  });

  describe('committed contract (C3, D10)', () => {
    const file = fileURLToPath(new URL('../../openapi.json', import.meta.url));
    const hint =
      'Run: pnpm --filter @portfolio/api openapi:generate and commit apps/api/openapi.json';

    const generated = async (): Promise<Node> => {
      app = await createTestApp();
      return JSON.parse(JSON.stringify(buildOpenApiDocument(app))) as Node;
    };

    it('has a committed openapi.json', () => {
      expect(existsSync(file), `apps/api/openapi.json does not exist. ${hint}`).toBe(true);
    });

    it('matches the document generated from the real AppModule', async () => {
      const committed = existsSync(file)
        ? (JSON.parse(readFileSync(file, 'utf8')) as Node)
        : undefined;

      expect(committed, `apps/api/openapi.json is missing or stale. ${hint}`).toEqual(
        await generated(),
      );
    });

    it('declares the OpenAPI version and a title', async () => {
      const document = await generated();

      expect(String(document['openapi'])).toMatch(/^3\.\d+\.\d+$/);
      expect(String(asNode(document['info'])['title'])).not.toBe('');
    });

    it('lists /health', async () => {
      const document = await generated();

      expect(Object.keys(asNode(document['paths']))).toContain('/health');
    });

    it('does not leak fixture routes', async () => {
      const document = await generated();

      expect(Object.keys(asNode(document['paths'])).some((p) => p.includes('fixtures'))).toBe(
        false,
      );
    });
  });
});
