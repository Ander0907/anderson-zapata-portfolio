import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

/**
 * No `standardSchemaConverter`: Swagger falls back to `~standard.jsonSchema`, which Zod 4 implements
 * natively, so `@Body({ schema })` documents the real schema.
 */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder().setTitle('Portfolio API').setVersion('1').build();
  return SwaggerModule.createDocument(app, config);
}
