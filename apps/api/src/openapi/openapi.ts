import type { INestApplication } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';

// Inert seam: the real document builder arrives with the GREEN step.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function buildOpenApiDocument(_app: INestApplication): OpenAPIObject {
  return { openapi: '', info: { title: '', version: '' }, paths: {} };
}
